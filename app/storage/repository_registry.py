"""Repository registry module."""
import pickle
from app.core.config import REPOSITORY_STORAGE

REGISTRY_FILE = REPOSITORY_STORAGE / "registry.pkl"


import time

class RepositoryRegistry:

    def __init__(self):
        self.repositories = {}
        self._load()
        self.cache_ttl_seconds = 24 * 3600  # 24 hours

    def _load(self):
        if REGISTRY_FILE.exists():
            try:
                with open(REGISTRY_FILE, "rb") as f:
                    self.repositories = pickle.load(f)
            except Exception as e:
                print(f"[registry] Failed to load registry: {e}")

        if not self.repositories:
            self._auto_index_self()

    def _auto_index_self(self):
        """Automatically index the local CodeBase repository if registry is empty (e.g. after container restart)."""
        try:
            from app.core.config import BASE_DIR
            from app.indexing.scanner import scan_repository
            from app.parsers.parser_registry import PARSER_REGISTRY
            from app.indexing.index_builder import IndexBuilder

            py_files = [
                f for f in scan_repository(BASE_DIR)
                if f.suffix == ".py" and not any(part.startswith(".") for part in f.parts) and "node_modules" not in f.parts
            ]
            if not py_files:
                return

            parsed_files = []
            for f in py_files:
                p = PARSER_REGISTRY.get(f.suffix)
                if p:
                    try:
                        src = f.read_text(encoding="utf-8", errors="ignore")[:8000]
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
            with open(REGISTRY_FILE, "wb") as f:
                pickle.dump(self.repositories, f)
        except Exception as e:
            print(f"[registry] Failed to save registry: {e}")

    def _normalize(self, name: str) -> str:
        if not name:
            return ""
        clean = str(name).strip()
        if "github.com/" in clean:
            clean = clean.split("github.com/")[-1]
        clean = clean.rstrip("/").split("/")[-1]
        if clean.endswith(".git"):
            clean = clean[:-4]
        return clean.strip().lower()

    def register(self, name, repository_index):
        clean_name = str(name).strip()
        self.repositories[clean_name] = {
            "index": repository_index,
            "timestamp": time.time()
        }
        self._save()

        # Feed BM25 sparse index
        try:
            from app.retrieval.sparse_search import bm25_retriever
            if hasattr(repository_index, "entities"):
                bm25_retriever.index_entities(clean_name, repository_index.entities)
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

    def get(self, name):
        if not self.repositories:
            self._load()

        if not self.repositories:
            self._auto_index_self()

        if not self.repositories:
            return None

        # If no name was requested, only fallback if exactly one repo exists
        if not name:
            if len(self.repositories) == 1:
                sole_record = next(iter(self.repositories.values()))
                return self._extract_index(sole_record)
            return None

        # 1. Exact match
        if name in self.repositories:
            return self._extract_index(self.repositories[name])

        # 2. Case-insensitive and normalized match
        norm = self._normalize(name)
        if norm:
            for k, record in self.repositories.items():
                if self._normalize(k) == norm or k.strip().lower() == norm:
                    return self._extract_index(record)

        # 3. Substring match (e.g. "CodeBase" in "Mayank459/CodeBase")
        if norm:
            for k, record in self.repositories.items():
                k_norm = self._normalize(k)
                if norm in k_norm or k_norm in norm:
                    return self._extract_index(record)

        # Do not return a different repository when a specific name was requested!
        return None

    def contains(self, name) -> bool:
        if not name:
            return False
        if name in self.repositories:
            return True
        norm = self._normalize(name)
        if norm:
            for k in self.repositories:
                if self._normalize(k) == norm or k.strip().lower() == norm:
                    return True
                k_norm = self._normalize(k)
                if norm in k_norm or k_norm in norm:
                    return True
        return False


repository_registry = RepositoryRegistry()