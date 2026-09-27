"""Repository registry module."""
import pickle
import re
import threading
import time

from app.core.config import REPOSITORY_STORAGE

REGISTRY_FILE = REPOSITORY_STORAGE / "registry.pkl"

# How long a failed rebuild is remembered before trying again (seconds)
_REHYDRATE_RETRY_AFTER = 300


def normalize_repo_name(name) -> str:
    """The one name a repository is stored under, derived the same way the
    indexer names its clone directory: last URL segment, no `.git`, unsafe
    characters replaced. `psf/requests`, `https://github.com/psf/requests.git`
    and `requests` all become `requests`."""
    if not name:
        return ""
    clean = str(name).strip()
    if "github.com/" in clean:
        clean = clean.split("github.com/")[-1]
    clean = clean.rstrip("/").split("/")[-1]
    if clean.endswith(".git"):
        clean = clean[:-4]
    return re.sub(r"[^a-zA-Z0-9_\-\.]", "_", clean.strip())


class RepositoryRegistry:

    def __init__(self):
        self.repositories = {}
        self._lock = threading.RLock()
        self._rehydrate_failed = {}  # name -> timestamp of the last failed attempt
        self._load()

    def _load(self):
        if REGISTRY_FILE.exists():
            try:
                with open(REGISTRY_FILE, "rb") as f:
                    self.repositories = pickle.load(f)
            except Exception as e:
                print(f"[registry] Failed to load registry: {e}")

        if not self.repositories:
            self._auto_index_self()
        else:
            self._reindex_sparse()

    def _reindex_sparse(self):
        """BM25 lives only in memory: rebuild it for repositories loaded from the
        pickle, or keyword search is empty after every restart."""
        try:
            from app.indexing.models.entity_extractor import EntityExtractor
            from app.retrieval.sparse_search import bm25_retriever
            for name, record in self.repositories.items():
                index = self._extract_index(record)
                if index is not None and getattr(index, "parsed_files", None):
                    bm25_retriever.index_entities(name, EntityExtractor().extract_entities(index.parsed_files))
        except Exception as e:
            print(f"[registry] BM25 rebuild on load failed: {e}")

    def _auto_index_self(self):
        """Automatically index the local CodeBase repository if registry is empty (e.g. after container restart)."""
        try:
            from app.core.config import BASE_DIR
            from app.indexing.scanner import scan_repository
            from app.parsers.parser_registry import PARSER_REGISTRY
            from app.indexing.index_builder import IndexBuilder

            py_files = [
                f for f in scan_repository(BASE_DIR)
                if f.suffix == ".py" and "node_modules" not in f.parts
            ]
            if not py_files:
                return

            parsed_files = []
            for f in py_files:
                p = PARSER_REGISTRY.get(f.suffix)
                if p:
                    try:
                        src = f.read_text(encoding="utf-8", errors="ignore")
                        parsed_files.append(p(f.relative_to(BASE_DIR).as_posix(), src))
                    except Exception:
                        pass

            if parsed_files:
                builder = IndexBuilder()
                repo_index = builder.build("CodeBase", parsed_files)
                self.register("CodeBase", repo_index)
                print(f"[registry] Auto-indexed CodeBase ({len(parsed_files)} files, {repo_index.graph.number_of_nodes()} nodes)")
        except Exception as e:
            print(f"[registry] Auto-indexing CodeBase failed: {e}")

    def _save(self):
        try:
            REPOSITORY_STORAGE.mkdir(parents=True, exist_ok=True)
            with self._lock:
                snapshot = dict(self.repositories)
            with open(REGISTRY_FILE, "wb") as f:
                pickle.dump(snapshot, f)
        except Exception as e:
            print(f"[registry] Failed to save registry: {e}")

    # Kept for callers that used the old private helper
    def _normalize(self, name: str) -> str:
        return normalize_repo_name(name).lower()

    def register(self, name, repository_index, entities=None):
        clean_name = str(name).strip()
        with self._lock:
            self.repositories[clean_name] = {
                "index": repository_index,
                "timestamp": time.time()
            }
            self._rehydrate_failed.pop(clean_name.lower(), None)
        self._save()

        # Feed the BM25 sparse index. RepositoryIndex has no entities of its own,
        # so callers pass the extracted entities; without them keyword search
        # stayed empty and "hybrid" retrieval was dense-only.
        entities = entities if entities is not None else getattr(repository_index, "entities", None)
        if entities:
            try:
                from app.retrieval.sparse_search import bm25_retriever
                bm25_retriever.index_entities(clean_name, entities)
            except Exception as e:
                print(f"[registry] BM25 indexing error: {e}")

        # Persist metadata to database
        try:
            from app.storage.db import db_manager
            file_count = len(getattr(repository_index, "parsed_files", []))
            node_count = repository_index.graph.number_of_nodes() if hasattr(repository_index, "graph") else 0
            db_manager.save_repository_metadata(
                name=clean_name,
                file_count=file_count,
                node_count=node_count
            )
        except Exception as e:
            print(f"[registry] DB metadata save error: {e}")

    def _extract_index(self, record):
        if not record:
            return None
        if not isinstance(record, dict):
            return record
        return record.get("index")

    def _find_key(self, name):
        """Registered key for `name`: exact, then case-insensitive on the
        normalized name. No substring matching: `api` must not find `fastapi`."""
        if not name:
            return None
        with self._lock:
            if name in self.repositories:
                return name
            norm = normalize_repo_name(name).lower()
            if not norm:
                return None
            for k in self.repositories:
                if normalize_repo_name(k).lower() == norm:
                    return k
        return None

    def resolve(self, name) -> str:
        """Canonical stored name for a requested repository (used for vector
        filters, which match exactly and case-sensitively)."""
        return self._find_key(name) or normalize_repo_name(name)

    def _rehydrate(self, name):
        """Rebuild a repository's graph after a restart when its vectors are
        still in Qdrant: re-clone and re-parse, without re-embedding."""
        norm = normalize_repo_name(name)
        if not norm:
            return None
        key = norm.lower()
        failed_at = self._rehydrate_failed.get(key)
        if failed_at and time.time() - failed_at < _REHYDRATE_RETRY_AFTER:
            return None
        # ponytail: one registry-wide lock around the clone; rebuilds of different repos queue behind each other. Per-repo locks if that ever matters.
        with self._lock:
            existing = self._find_key(name)
            if existing:
                return self._extract_index(self.repositories[existing])
            try:
                from app.storage.vector_store import count_repository_points, get_repository_source_url
                if count_repository_points(norm) == 0:
                    self._rehydrate_failed[key] = time.time()
                    return None
                from app.indexing.repository_loader import normalize_repo_url
                source_url = get_repository_source_url(norm) or normalize_repo_url(norm)
                from app.services.repository_indexer import rebuild_graph
                print(f"[registry] Rebuilding graph for '{norm}' from {source_url} (vectors found, registry empty)")
                repository_index, entities = rebuild_graph(source_url)
                if repository_index.repository_name != norm:
                    # the clone resolved to a different repository; do not mislabel it
                    self._rehydrate_failed[key] = time.time()
                    return None
                self.register(norm, repository_index, entities=entities)
                return repository_index
            except Exception as e:
                print(f"[registry] Rebuild failed for '{norm}': {e}")
                self._rehydrate_failed[key] = time.time()
                return None

    def get(self, name):
        if not self.repositories:
            self._load()

        # If no name was requested, only fallback if exactly one repo exists
        if not name:
            if len(self.repositories) == 1:
                sole_record = next(iter(self.repositories.values()))
                return self._extract_index(sole_record)
            return None

        key = self._find_key(name)
        if key:
            return self._extract_index(self.repositories[key])

        # Not in memory (e.g. the server restarted): rebuild it if Qdrant has it
        return self._rehydrate(name)

    def contains(self, name) -> bool:
        return self._find_key(name) is not None


repository_registry = RepositoryRegistry()
