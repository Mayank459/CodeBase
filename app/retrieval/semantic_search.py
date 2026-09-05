"""Semantic search module."""
from typing import Optional
from app.storage.search import search


class SemanticSearcher:

    def search(
        self,
        query: str,
        top_k: int = 5,
        repository_name: Optional[str] = None
    ):
        return search(
            query=query,
            top_k=top_k,
            repository_name=repository_name
        )