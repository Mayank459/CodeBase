from pathlib import Path
import sys
import time
from typing import Callable, Optional, List, Dict, Any
import subprocess
import threading

from app.indexing.repository_loader import clone_repository
from app.indexing.scanner import scan_repository
from app.parsers.parser_registry import PARSER_REGISTRY
from app.indexing.index_builder import IndexBuilder
from app.indexing.models.entity_extractor import EntityExtractor
from app.embeddings.embedding_service import EmbeddingService
from app.storage.vector_store import create_collection, store_entities
from app.storage.db import db_manager

# Cap source code sent to parser/embedder (characters)
MAX_SOURCE_CHARS = 8_000


def _safe_print(msg: str) -> None:
    """Print to stdout with ASCII fallback for Windows consoles (cp1252 etc.)."""
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode(sys.stdout.encoding or "ascii", errors="replace").decode(
            sys.stdout.encoding or "ascii"
        ))


class RepositoryIndexer:

    def __init__(self):
        self.index_builder = IndexBuilder()
        self.entity_extractor = EntityExtractor()
        self.embedding_service = EmbeddingService()

    def _get_git_commit_sha(self, repo_path: Path) -> Optional[str]:
        """Attempt to extract git commit SHA for revision tracking."""
        try:
            res = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=str(repo_path),
                capture_output=True,
                text=True,
                timeout=5
            )
            if res.returncode == 0:
                return res.stdout.strip()
        except Exception:
            pass
        return None

    def index_repository(
        self,
        repo_url: str,
        on_progress: Optional[Callable[[dict], None]] = None,
        force: bool = False,
        cancel_token: Optional[threading.Event] = None
    ) -> dict:
        """
        Index a repository end-to-end with cancellation, revision tracking,
        and structured failure reporting.
        """
        def check_cancellation():
            if cancel_token and cancel_token.is_set():
                from app.indexing.job_manager import JobCancelledError
                raise JobCancelledError("Indexing cancelled by user.")

        def emit(step: str, message: str, progress: int = None, **extra):
            check_cancellation()
            _safe_print(f"[indexer] {message}")
            if on_progress:
                payload = {"step": step, "message": message, **extra}
                if progress is not None:
                    payload["progress"] = progress
                on_progress(payload)

        t0 = time.time()
        repo_name = repo_url.rstrip("/").split("/")[-1]
        if repo_name.endswith(".git"):
            repo_name = repo_name[:-4]

        # -- 0. Cache Check ---------------------------------------------------
        from app.storage.repository_registry import repository_registry
        if not force and repository_registry.contains(repo_name):
            emit("cache", f"Cache hit: {repo_name} is already indexed. Loading from disk...", progress=100)
            repository_index = repository_registry.get(repo_name)
            meta = db_manager.get_repository_metadata(repo_name) or {}
            result = {
                "repository": repository_index.repository_name,
                "commit_sha": meta.get("commit_sha"),
                "files_parsed": len(repository_index.parsed_files),
                "entities": repository_index.graph.number_of_nodes(),
                "graph_nodes": repository_index.graph.number_of_nodes(),
                "graph_edges": repository_index.graph.number_of_edges(),
                "file_errors": [],
                "index_time_seconds": 0.0,
            }
            emit("done", "Loaded from cache successfully!", progress=100, **result)
            return result

        # If force=True, delete old embeddings first for a clean slate
        if force and repository_registry.contains(repo_name):
            emit("cleanup_old", f"Deleting old embeddings for {repo_name} (force re-index)...", progress=5)
            from app.storage.vector_store import delete_repository
            try:
                delete_repository(repo_name)
                emit("cleanup_old_done", f"Old embeddings deleted successfully", progress=10)
            except Exception as e:
                emit("cleanup_old_warn", f"Warning: could not delete old embeddings: {e}", progress=10)

        # -- 1. Clone ---------------------------------------------------------
        emit("clone", f"Cloning {repo_url} ...", progress=15)
        repo_path = clone_repository(repo_url)
        commit_sha = self._get_git_commit_sha(Path(repo_path))
        emit("clone_done", f"Clone done in {time.time()-t0:.1f}s (Commit SHA: {commit_sha or 'unknown'})", progress=25)

        # -- 2. Scan ----------------------------------------------------------
        t1 = time.time()
        emit("scan", "Scanning files ...", progress=30)
        files = scan_repository(repo_path)
        emit("scan_done", f"Found {len(files)} files in {time.time()-t1:.1f}s", progress=35, file_count=len(files))

        # -- 3. Parse ---------------------------------------------------------
        t2 = time.time()
        emit("parse", f"Parsing {len(files)} files ...", progress=40)
        parsed_files = []
        file_errors: List[Dict[str, str]] = []

        for idx, file in enumerate(files):
            check_cancellation()
            parser = PARSER_REGISTRY.get(file.suffix)
            if parser is None:
                continue
            try:
                source_code = file.read_text(encoding="utf8", errors="ignore")
                if len(source_code) > MAX_SOURCE_CHARS:
                    source_code = source_code[:MAX_SOURCE_CHARS]

                rel_path = file.relative_to(repo_path).as_posix()
                parsed = parser(rel_path, source_code)
                parsed.source_code = source_code
                parsed_files.append(parsed)
            except Exception as e:
                rel_path = file.relative_to(repo_path).as_posix() if repo_path in str(file) else file.name
                file_errors.append({"file": rel_path, "error": str(e)})
                _safe_print(f"[indexer] Parse error {file}: {e}")

        emit("parse_done", f"Parsed {len(parsed_files)} files ({len(file_errors)} errors) in {time.time()-t2:.1f}s",
             progress=55, parsed_count=len(parsed_files), errors_count=len(file_errors))

        # -- 4. Build graph ---------------------------------------------------
        check_cancellation()
        emit("graph", "Building dependency graph ...", progress=60)
        repository_index = self.index_builder.build(
            repository_name=Path(repo_path).name,
            parsed_files=parsed_files,
        )

        # -- 5. Extract entities ----------------------------------------------
        check_cancellation()
        emit("extract", "Extracting code entities ...", progress=70)
        entities = self.entity_extractor.extract_entities(parsed_files)

        from app.analysis.repository_summarizer import RepositorySummarizer
        summarizer = RepositorySummarizer()
        summary_entity = summarizer.generate_summary(
            repository_index=repository_index,
            start_id=len(entities) + 1,
        )
        entities.append(summary_entity)
        emit("extract_done", f"Extracted {len(entities)} entities", progress=75, entity_count=len(entities))

        # -- 6. Embed ---------------------------------------------------------
        check_cancellation()
        t3 = time.time()
        emit("embed", f"Embedding {len(entities)} entities ...", progress=80)
        embedded_entities = self.embedding_service.embed_entities(entities)
        emit("embed_done", f"Embedding done in {time.time()-t3:.1f}s", progress=90)

        # -- 7. Store ---------------------------------------------------------
        check_cancellation()
        t4 = time.time()
        emit("store", "Storing vectors in Qdrant ...", progress=92)
        create_collection()
        store_entities(repository_index.repository_name, entities, embedded_entities)
        emit("store_done", f"Stored in {time.time()-t4:.1f}s", progress=95)

        # -- 8. Register ------------------------------------------------------
        from app.storage.repository_registry import repository_registry
        repository_registry.register(
            repository_index.repository_name,
            repository_index,
        )
        if commit_sha:
            db_manager.save_repository_metadata(
                name=repository_index.repository_name,
                repo_url=repo_url,
                commit_sha=commit_sha,
                file_count=len(parsed_files),
                node_count=repository_index.graph.number_of_nodes()
            )

        # -- 9. Cleanup Raw Files ---------------------------------------------
        import shutil
        try:
            emit("cleanup", f"Cleaning up temporary cloned files...", progress=98)
            shutil.rmtree(repo_path, ignore_errors=True)
        except Exception as e:
            _safe_print(f"[indexer] Cleanup failed: {e}")

        total = time.time() - t0
        result = {
            "repository": repository_index.repository_name,
            "commit_sha": commit_sha,
            "files_parsed": len(parsed_files),
            "entities": len(entities),
            "graph_nodes": repository_index.graph.number_of_nodes(),
            "graph_edges": repository_index.graph.number_of_edges(),
            "file_errors": file_errors,
            "index_time_seconds": round(total, 1),
        }
        emit("done", f"Indexing complete in {total:.1f}s", progress=100, **result)
        return result
