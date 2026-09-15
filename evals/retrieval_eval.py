"""Retrieval Evaluation Metrics: Hit Rate@K, MRR@K, Context Precision and Recall."""
from typing import List, Dict, Any

class RetrievalEvaluator:
    """Evaluates the quality of codebase retrieval (AST chunks and vector matches)."""

    @staticmethod
    def is_hit(retrieved_items: List[Dict[str, Any]], expected_files: List[str], expected_symbols: List[str]) -> bool:
        """Determines if any retrieved item matches expected files or symbols."""
        norm_expected_files = [f.replace("\\", "/").lower() for f in expected_files]
        norm_expected_symbols = [s.lower() for s in expected_symbols]

        for item in retrieved_items:
            file_path = item.get("file_path", "").replace("\\", "/").lower()
            symbol = item.get("symbol_name", "").lower()

            if any(exp in file_path or file_path.endswith(exp) for exp in norm_expected_files):
                return True
            if any(sym in symbol for sym in norm_expected_symbols):
                return True
        return False

    @staticmethod
    def calculate_hit_rate(
        queries_results: List[Dict[str, Any]],
        k: int = 5
    ) -> float:
        """Calculates Hit Rate @ K across all queries."""
        if not queries_results:
            return 0.0

        hits = 0
        for qr in queries_results:
            top_k = qr["retrieved"][:k]
            if RetrievalEvaluator.is_hit(top_k, qr["expected_files"], qr.get("expected_symbols", [])):
                hits += 1

        return round(hits / len(queries_results), 4)

    @staticmethod
    def calculate_mrr(
        queries_results: List[Dict[str, Any]],
        k: int = 5
    ) -> float:
        """Calculates Mean Reciprocal Rank (MRR @ K)."""
        if not queries_results:
            return 0.0

        rr_sum = 0.0
        for qr in queries_results:
            top_k = qr["retrieved"][:k]
            norm_expected_files = [f.replace("\\", "/").lower() for f in qr["expected_files"]]
            norm_expected_symbols = [s.lower() for s in qr.get("expected_symbols", [])]

            reciprocal_rank = 0.0
            for rank, item in enumerate(top_k, start=1):
                file_path = item.get("file_path", "").replace("\\", "/").lower()
                symbol = item.get("symbol_name", "").lower()

                match_file = any(exp in file_path or file_path.endswith(exp) for exp in norm_expected_files)
                match_symbol = any(sym in symbol for sym in norm_expected_symbols)

                if match_file or match_symbol:
                    reciprocal_rank = 1.0 / rank
                    break
            rr_sum += reciprocal_rank

        return round(rr_sum / len(queries_results), 4)

    @staticmethod
    def calculate_context_precision(
        retrieved_items: List[Dict[str, Any]],
        expected_files: List[str]
    ) -> float:
        """Calculates proportion of relevant retrieved chunks."""
        if not retrieved_items:
            return 0.0

        norm_expected = [f.replace("\\", "/").lower() for f in expected_files]
        relevant_count = 0

        for item in retrieved_items:
            file_path = item.get("file_path", "").replace("\\", "/").lower()
            if any(exp in file_path or file_path.endswith(exp) for exp in norm_expected):
                relevant_count += 1

        return round(relevant_count / len(retrieved_items), 4)
