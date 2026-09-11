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
            return None

        # 1. Exact match
        if name and name in self.repositories:
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

        # 4. Fallback: if only one repository is registered, always return it
        if len(self.repositories) == 1:
            sole_record = next(iter(self.repositories.values()))
            return self._extract_index(sole_record)

        return None

    def contains(self, name) -> bool:
        return self.get(name) is not None


repository_registry = RepositoryRegistry()