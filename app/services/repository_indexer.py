from pathlib import Path
import sys
import time
from typing import Callable, Optional

from app.indexing.repository_loader import clone_repository
from app.indexing.scanner import scan_repository
from app.parsers.parser_registry import PARSER_REGISTRY
from app.indexing.index_builder import IndexBuilder
from app.indexing.models.entity_extractor import EntityExtractor
from app.embeddings.embedding_service import EmbeddingService
from app.storage.vector_store import create_collection, store_entities

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

    def index_repository(
        self,
        repo_url: str,
        on_progress: Optional[Callable[[dict], None]] = None,
    ) -> dict:
        """
        Index a repository end-to-end.

        Args:
            repo_url:    GitHub URL or local path.
            on_progress: Optional callback called at each step with a progress dict:
                         {"step": str, "message": str, ...extra}
        """

        def emit(step: str, message: str, **extra):
            _safe_print(f"[indexer] {message}")
            if on_progress:
                on_progress({"step": step, "message": message, **extra})

        t0 = time.time()
        repo_name = repo_url.rstrip("/").split("/")[-1]
        if repo_name.endswith(".git"):
            repo_name = repo_name[:-4]

        # -- 0. Cache Check ---------------------------------------------------
        from app.storage.repository_registry import repository_registry
        if repository_registry.contains(repo_name):
            emit("cache", f"Cache hit: {repo_name} is already indexed. Loading from disk...")
            repository_index = repository_registry.get(repo_name)
            result = {
                "repository": repository_index.repository_name,
                "files_parsed": len(repository_index.parsed_files),
                "entities": repository_index.graph.number_of_nodes(),
                "graph_nodes": repository_index.graph.number_of_nodes(),
                "graph_edges": repository_index.graph.number_of_edges(),
                "index_time_seconds": 0.0,
            }
            emit("done", "Loaded from cache successfully!", **result)
            return result

        # -- 1. Clone ---------------------------------------------------------
        emit("clone", f"Cloning {repo_url} ...")
        repo_path = clone_repository(repo_url)
        emit("clone_done", f"Clone done in {time.time()-t0:.1f}s")

        # -- 2. Scan ----------------------------------------------------------
        t1 = time.time()
        emit("scan", "Scanning files ...")
        files = scan_repository(repo_path)
        emit("scan_done", f"Found {len(files)} files in {time.time()-t1:.1f}s",
             file_count=len(files))

        # -- 3. Parse ---------------------------------------------------------
        t2 = time.time()
        emit("parse", f"Parsing {len(files)} files ...")
        parsed_files = []

        for file in files:
            parser = PARSER_REGISTRY.get(file.suffix)
            if parser is None:
                continue
            try:
                source_code = file.read_text(encoding="utf8", errors="ignore")
                if len(source_code) > MAX_SOURCE_CHARS:
                    source_code = source_code[:MAX_SOURCE_CHARS]
                
                # Make the path relative to the repo root so it displays cleanly in the UI
                rel_path = file.relative_to(repo_path).as_posix()
                parsed = parser(rel_path, source_code)
                parsed_files.append(parsed)
            except Exception as e:
                _safe_print(f"[indexer] Parse error {file}: {e}")

        emit("parse_done", f"Parsed {len(parsed_files)} files in {time.time()-t2:.1f}s",
             parsed_count=len(parsed_files))

        # -- 4. Build graph ---------------------------------------------------
        emit("graph", "Building dependency graph ...")
        repository_index = self.index_builder.build(
            repository_name=Path(repo_path).name,
            parsed_files=parsed_files,
        )

        # -- 5. Extract entities ----------------------------------------------
        emit("extract", "Extracting code entities ...")
        entities = self.entity_extractor.extract_entities(parsed_files)

        from app.analysis.repository_summarizer import RepositorySummarizer
        summarizer = RepositorySummarizer()
        summary_entity = summarizer.generate_summary(
            repository_index=repository_index,
            start_id=len(entities) + 1,
        )
        entities.append(summary_entity)
        emit("extract_done", f"Extracted {len(entities)} entities",
             entity_count=len(entities))

        # -- 6. Embed ---------------------------------------------------------
        t3 = time.time()
        emit("embed", f"Embedding {len(entities)} entities (slowest step) ...")
        embedded_entities = self.embedding_service.embed_entities(entities)
        emit("embed_done", f"Embedding done in {time.time()-t3:.1f}s")

        # -- 7. Store ---------------------------------------------------------
        t4 = time.time()
        emit("store", "Storing vectors in Qdrant ...")
        create_collection()
        store_entities(repository_index.repository_name, entities, embedded_entities)
        emit("store_done", f"Stored in {time.time()-t4:.1f}s")

        # -- 8. Register ------------------------------------------------------
        from app.storage.repository_registry import repository_registry
        repository_registry.register(
            repository_index.repository_name,
            repository_index,
        )
        
        # -- 9. Cleanup Raw Files ---------------------------------------------
        import shutil
        try:
            emit("cleanup", f"Cleaning up raw source files to save disk space...")
            shutil.rmtree(repo_path, ignore_errors=True)
        except Exception as e:
            _safe_print(f"[indexer] Cleanup failed: {e}")

        total = time.time() - t0
        result = {
            "repository": repository_index.repository_name,
            "files_parsed": len(parsed_files),
            "entities": len(entities),
            "graph_nodes": repository_index.graph.number_of_nodes(),
            "graph_edges": repository_index.graph.number_of_edges(),
            "index_time_seconds": round(total, 1),
        }
        emit("done", f"Indexing complete in {total:.1f}s", **result)
        return result
