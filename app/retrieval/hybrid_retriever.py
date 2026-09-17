"""Hybrid retriever module combining dense semantic search, sparse BM25, and bidirectional graph expansion."""
import time
from typing import Optional, List, Dict, Any
from app.retrieval.semantic_search import SemanticSearcher
from app.retrieval.sparse_search import bm25_retriever
from app.retrieval.ranking import ranker
from app.retrieval.context_expander import GraphContextExpander
from app.observability.metrics import metrics
from app.observability.tracer import tracer


class HybridRetriever:
    """
    Production-grade hybrid code retriever:
    1. Query normalization / optional rewrite
    2. Dense vector search via Qdrant
    3. Sparse BM25 search via symbol inverted index
    4. Reciprocal Rank Fusion (RRF)
    5. Controlled bidirectional graph BFS expansion
    """

    def __init__(
        self,
        graph,
        repository_name: Optional[str] = None
    ):
        self.graph = graph
        self.repository_name = repository_name
        self.semantic = SemanticSearcher()
        self.expander = GraphContextExpander(graph)

    def _rewrite_query(self, query: str) -> str:
        """Lightweight query expansion for common developer intents."""
        normalized = query.lower()
        expansions = []
        if "login" in normalized or "auth" in normalized:
            expansions.extend(["auth", "jwt", "token", "session", "middleware"])
        elif "router" in normalized or "route" in normalized or "endpoint" in normalized:
            expansions.extend(["api", "router", "endpoint", "path"])
        elif "database" in normalized or "storage" in normalized:
            expansions.extend(["db", "model", "schema", "store"])

        if expansions:
            # Append relevant domain terms to the query
            return f"{query} {' '.join(expansions)}"
        return query

    def retrieve(
        self,
        query: str,
        repository_name: Optional[str] = None,
        top_k: int = 5,
        graph_depth: int = 2,
        max_graph_nodes: int = 25,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute hybrid retrieval pipeline.
        Returns:
          {
            "results": list of RankedItem,
            "semantic_results": raw dense points,
            "sparse_results": raw sparse documents,
            "graph_context": bidirectional graph neighbors,
            "telemetry": timing breakdown
          }
        """
        target_repo = repository_name or self.repository_name
        expanded_query = self._rewrite_query(query)
        timing = {}

        # 1. Parallel / Combined Dense + Sparse Retrieval
        retrieval_start = time.perf_counter()

        dense_results = []
        try:
            dense_results = self.semantic.search(
                query=query,
                top_k=top_k * 2,
                repository_name=target_repo
            )
        except Exception as exc:
            print(f"[HybridRetriever] Dense search error: {exc}")

        sparse_results = []
        try:
            sparse_results = bm25_retriever.search(
                query=expanded_query,
                top_k=top_k * 2,
                repository_name=target_repo
            )
        except Exception as exc:
            print(f"[HybridRetriever] Sparse BM25 search error: {exc}")

        timing["retrieval_ms"] = round((time.perf_counter() - retrieval_start) * 1000, 2)

        # 2. Reciprocal Rank Fusion
        fused_items = ranker.reciprocal_rank_fusion(
            dense_results=dense_results,
            sparse_results=sparse_results,
            top_k=top_k
        )

        # Fallback if both returned nothing
        if not fused_items and dense_results:
            fused_items = [
                ranker.RankedItem(
                    item_id=str(r.id),
                    payload=r.payload,
                    score=r.score
                )
                for r in dense_results[:top_k]
            ]

        # 3. Controlled Bidirectional Graph Expansion
        graph_start = time.perf_counter()
        graph_context: List[Dict[str, Any]] = []
        seen_nodes = set()

        for item in fused_items:
            node_id = item.graph_node_id or item.id
            if node_id and node_id not in seen_nodes:
                seen_nodes.add(node_id)
                expanded = self.expander.expand(
                    graph_node_id=node_id,
                    depth=graph_depth,
                    max_nodes=max_graph_nodes // max(1, len(fused_items))
                )
                graph_context.extend(expanded)

        timing["graph_expansion_ms"] = round((time.perf_counter() - graph_start) * 1000, 2)

        # Telemetry recording
        if hasattr(metrics, "record_latency"):
            metrics.record_latency("retrieval", timing["retrieval_ms"] / 1000.0)
            metrics.record_latency("graph_expansion", timing["graph_expansion_ms"] / 1000.0)

        return {
            "results": fused_items,
            "semantic_results": dense_results,
            "sparse_results": sparse_results,
            "graph_context": graph_context,
            "telemetry": timing
        }