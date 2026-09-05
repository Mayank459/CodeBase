"""Hybrid retriever module."""
from typing import Optional
from app.retrieval.semantic_search import SemanticSearcher
from app.retrieval.context_expander import GraphContextExpander


class HybridRetriever:

    def __init__(
        self,
        graph,
        repository_name: Optional[str] = None
    ):
        self.graph = graph
        self.repository_name = repository_name
        self.semantic = SemanticSearcher()
        self.expander = GraphContextExpander(graph)

    def retrieve(
        self,
        query: str,
        repository_name: Optional[str] = None
    ):
        target_repo = repository_name or self.repository_name
        semantic_results = (
            self.semantic.search(
                query=query,
                top_k=5,
                repository_name=target_repo
            )
        )

        graph_context = []

        for result in semantic_results:
            payload = result.payload
            graph_node_id = payload.get("graph_node_id", "")
            graph_context.extend(self.expander.expand(graph_node_id))

        return {
            "semantic_results": semantic_results,
            "graph_context": graph_context
        }