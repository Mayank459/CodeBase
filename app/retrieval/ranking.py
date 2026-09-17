"""Retrieval ranking and Reciprocal Rank Fusion (RRF) module."""
from typing import List, Dict, Any, Optional
from collections import defaultdict


class RankedItem:
    """Unified container for ranked code entities."""
    def __init__(self, item_id: str, payload: Dict[str, Any], score: float, rank_details: Optional[Dict[str, Any]] = None):
        self.id = item_id
        self.payload = payload
        self.score = score
        self.rank_details = rank_details or {}

    @property
    def name(self) -> str:
        return self.payload.get("name", "")

    @property
    def file_path(self) -> str:
        return self.payload.get("file_path", "")

    @property
    def content(self) -> str:
        return self.payload.get("content", "")

    @property
    def graph_node_id(self) -> str:
        return self.payload.get("graph_node_id", "")

    def __repr__(self):
        return f"<RankedItem id={self.id} name={self.name} score={self.score:.4f}>"


class ResultRanker:
    """
    Hybrid ranker combining dense semantic search and BM25 sparse search
    using Reciprocal Rank Fusion (RRF) and lexical symbol boosting.
    """

    def __init__(self, rrf_k: int = 60, dense_weight: float = 1.0, sparse_weight: float = 1.0):
        self.rrf_k = rrf_k
        self.dense_weight = dense_weight
        self.sparse_weight = sparse_weight

    def reciprocal_rank_fusion(
        self,
        dense_results: List[Any],
        sparse_results: List[Any],
        top_k: int = 10
    ) -> List[RankedItem]:
        """
        Merge ranked lists from dense vector search and sparse BM25 search.
        RRF formula: score(d) = sum_{m} w_m / (k + rank_m(d))
        """
        rrf_scores: Dict[str, float] = defaultdict(float)
        payload_map: Dict[str, Dict[str, Any]] = {}
        rank_details: Dict[str, Dict[str, Any]] = defaultdict(dict)

        # 1. Process Dense Results
        for rank, item in enumerate(dense_results, start=1):
            doc_id = str(getattr(item, "id", ""))
            payload = getattr(item, "payload", {}) or {}
            # Fallback doc_id from payload if id is missing or raw int
            if not doc_id or doc_id.isdigit():
                doc_id = payload.get("graph_node_id") or f"{payload.get('file_path', '')}::{payload.get('name', '')}"

            payload_map[doc_id] = payload
            contrib = self.dense_weight / (self.rrf_k + rank)
            rrf_scores[doc_id] += contrib
            rank_details[doc_id]["dense_rank"] = rank
            rank_details[doc_id]["dense_score"] = getattr(item, "score", 0.0)

        # 2. Process Sparse Results
        for rank, item in enumerate(sparse_results, start=1):
            doc_id = str(getattr(item, "id", ""))
            payload = getattr(item, "payload", {}) or {}
            if not doc_id or doc_id.isdigit():
                doc_id = payload.get("graph_node_id") or f"{payload.get('file_path', '')}::{payload.get('name', '')}"

            if doc_id not in payload_map:
                payload_map[doc_id] = payload
            contrib = self.sparse_weight / (self.rrf_k + rank)
            rrf_scores[doc_id] += contrib
            rank_details[doc_id]["sparse_rank"] = rank
            rank_details[doc_id]["sparse_score"] = getattr(item, "score", 0.0)

        # 3. Sort by total RRF score
        sorted_candidates = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]

        ranked_items = [
            RankedItem(
                item_id=doc_id,
                payload=payload_map.get(doc_id, {}),
                score=round(score, 6),
                rank_details=rank_details.get(doc_id, {})
            )
            for doc_id, score in sorted_candidates
        ]
        return ranked_items

    def rank(self, query: str, results: list) -> list:
        """Lexical overlap booster for single list of results (backward compatibility)."""
        if not results:
            return []
        query_terms = set(query.lower().split())

        ranked_results = []
        for result in results:
            score = getattr(result, "score", 0.0) or 0.0
            name = getattr(result, "name", "")
            if not name and hasattr(result, "payload") and isinstance(result.payload, dict):
                name = result.payload.get("name", "")

            if name:
                name_terms = set(name.lower().split("_"))
                overlap = len(query_terms.intersection(name_terms))
                score += overlap * 2.0  # Boost for direct name match

            ranked_results.append((score, result))

        ranked_results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in ranked_results]


ranker = ResultRanker()
