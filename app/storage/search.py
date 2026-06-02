"""Search module."""
from app.storage.qdrant_client import get_client
from app.storage.vector_store import COLLECTION_NAME
from app.embeddings.embedding_service import EmbeddingService

embedding_service = EmbeddingService()

def search(query, top_k=5):
    client = get_client()
    query_vector = embedding_service.embed_text(query)
    
    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=top_k
    )
    return results.points