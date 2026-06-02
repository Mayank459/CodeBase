"""Hybrid retriever module."""
from app.retrieval.semantic_search import (
    SemanticSearcher
)

from app.retrieval.context_expander import (
    GraphContextExpander
)


class HybridRetriever:

    def __init__(
        self,
        graph
    ):

        self.semantic = (
            SemanticSearcher()
        )

        self.expander = (
            GraphContextExpander(graph)
        )

    def retrieve(
        self,
        query: str
    ):

        semantic_results = (
            self.semantic.search(
                query=query,
                top_k=5
            )
        )

        graph_context = []

        for result in semantic_results:

            payload = result.payload

            graph_node_id = payload.get(
                "graph_node_id",
                ""
            )

            graph_context.extend(
                self.expander.expand(
                    graph_node_id
                )
            )

        return {
            "semantic_results":
                semantic_results,

            "graph_context":
                graph_context
        }