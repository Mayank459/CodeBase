"""Caching module with LRU/TTL in-memory cache, optional Redis backend, and hit-rate telemetry."""
import os
import time
import json
import hashlib
from typing import Optional, Any, Dict, List
from collections import OrderedDict

from app.observability.metrics import metrics


class LRUTTLCache:
    """Bounded in-memory LRU cache with per-item TTL expiration."""

    def __init__(self, max_size: int = 1000, default_ttl_sec: int = 3600):
        self.max_size = max_size
        self.default_ttl = default_ttl_sec
        self._cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            self.misses += 1
            return None

        val, expiry = self._cache[key]
        if time.time() > expiry:
            del self._cache[key]
            self.misses += 1
            return None

        # Move to end (most recently used)
        self._cache.move_to_end(key)
        self.hits += 1
        return val

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        ttl = ttl or self.default_ttl
        expiry = time.time() + ttl

        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = (value, expiry)

        if len(self._cache) > self.max_size:
            # Pop least recently used
            self._cache.popitem(last=False)

    def clear(self):
        self._cache.clear()

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0


class CacheManager:
    """Unified cache manager coordinating embedding and summary caching with Redis fallback."""

    def __init__(self):
        self.embedding_cache = LRUTTLCache(max_size=2000, default_ttl_sec=86400)  # 24 hours
        self.summary_cache = LRUTTLCache(max_size=200, default_ttl_sec=3600 * 6)  # 6 hours
        self.redis_client = None
        self._init_redis()

    def _init_redis(self):
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                import redis
                self.redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
                self.redis_client.ping()
                print("[CacheManager] Connected to Redis backend.")
            except Exception as e:
                print(f"[CacheManager] Redis unavailable, using in-memory cache: {e}")
                self.redis_client = None

    def _hash_key(self, prefix: str, key: str) -> str:
        digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]
        return f"{prefix}:{digest}"

    # -----------------------------
    # Embedding Cache
    # -----------------------------
    def get_embedding(self, text: str) -> Optional[List[float]]:
        key = self._hash_key("embed", text.strip())
        val = self.embedding_cache.get(key)
        if val is not None:
            return val

        if self.redis_client:
            try:
                raw = self.redis_client.get(key)
                if raw:
                    vec = json.loads(raw)
                    self.embedding_cache.set(key, vec)
                    return vec
            except Exception:
                pass
        return None

    def set_embedding(self, text: str, vector: List[float]):
        key = self._hash_key("embed", text.strip())
        self.embedding_cache.set(key, vector)
        if self.redis_client:
            try:
                self.redis_client.setex(key, 86400, json.dumps(vector))
            except Exception:
                pass

    # -----------------------------
    # Repository Summary Cache
    # -----------------------------
    def get_repo_summary(self, repo_name: str, commit_sha: Optional[str] = None) -> Optional[str]:
        key = f"summary:{repo_name.lower()}:{commit_sha or 'latest'}"
        val = self.summary_cache.get(key)
        if val:
            return val
        if self.redis_client:
            try:
                return self.redis_client.get(key)
            except Exception:
                pass
        return None

    def set_repo_summary(self, repo_name: str, summary: str, commit_sha: Optional[str] = None):
        key = f"summary:{repo_name.lower()}:{commit_sha or 'latest'}"
        self.summary_cache.set(key, summary)
        if self.redis_client:
            try:
                self.redis_client.setex(key, 3600 * 6, summary)
            except Exception:
                pass

    def get_stats(self) -> Dict[str, Any]:
        return {
            "embedding_hit_rate": round(self.embedding_cache.hit_rate, 4),
            "embedding_cache_size": len(self.embedding_cache._cache),
            "summary_hit_rate": round(self.summary_cache.hit_rate, 4),
            "using_redis": self.redis_client is not None
        }


cache_manager = CacheManager()
