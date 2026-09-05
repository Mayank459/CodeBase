"""Search module."""
from typing import Optional
from qdrant_client.models import Filter, FieldCondition, MatchValue

from app.storage.qdrant_client import get_client
from app.storage.vector_store import COLLECTION_NAME
from app.embeddings.embedding_service import EmbeddingService

embedding_service = EmbeddingService()


def search(query: str, top_k: int = 5, repository_name: Optional[str] = None):
    client = get_client()
    query_vector = embedding_service.embed_text(query)

    query_filter = None
    if repository_name:
        query_filter = Filter(
            must=[
                FieldCondition(
                    key="repository_name",
                    match=MatchValue(value=repository_name)
                )
            ]
        )

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=query_filter,
        limit=top_k
    )
    return results.points