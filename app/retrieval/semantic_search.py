"""Semantic search module."""
from app.storage.search import search


class SemanticSearcher:

    def search(
        self,
        query: str,
        top_k: int = 5
    ):
        return search(
            query=query,
            top_k=top_k
        )