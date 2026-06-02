"""Qdrant client module.

Default: in-memory mode — no Docker required for development.
Set QDRANT_URL=http://localhost:6333 in .env to use a Docker/remote instance.
"""
import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()

_client_instance = None

def get_client() -> QdrantClient:
    global _client_instance
    if _client_instance is not None:
        return _client_instance

    _qdrant_url = os.getenv("QDRANT_URL", "")
    _qdrant_api_key = os.getenv("QDRANT_API_KEY", None)

    if _qdrant_url:
        # Production / Docker mode
        _client_instance = QdrantClient(url=_qdrant_url, api_key=_qdrant_api_key, timeout=60.0)
    else:
        # Development mode — saves to disk so embeddings survive restarts!
        from app.core.config import REPOSITORY_STORAGE
        db_path = REPOSITORY_STORAGE / "qdrant_db"
        db_path.mkdir(parents=True, exist_ok=True)
        _client_instance = QdrantClient(path=str(db_path))

    return _client_instance