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

    def _save(self):
        try:
            REPOSITORY_STORAGE.mkdir(parents=True, exist_ok=True)
            with open(REGISTRY_FILE, "wb") as f:
                pickle.dump(self.repositories, f)
        except Exception as e:
            print(f"[registry] Failed to save registry: {e}")

    def register(self, name, repository_index):
        self.repositories[name] = {
            "index": repository_index,
            "timestamp": time.time()
        }
        self._save()

    def get(self, name):
        record = self.repositories.get(name)
        if not record:
            return None

        # Backward compatibility for old cache format
        if not isinstance(record, dict):
            return record

        # TTL: treat stale registrations as not-indexed, but DO NOT delete the
        # embeddings — silently destroying data on access is destructive. The
        # user re-indexes to refresh the timestamp, which upserts the same IDs.
        if time.time() - record.get("timestamp", 0) > self.cache_ttl_seconds:
            return None

        return record["index"]

    def contains(self, name) -> bool:
        return self.get(name) is not None


repository_registry = RepositoryRegistry()