"""Retrieval Evaluation Metrics: Hit Rate@K, MRR@K, Context Precision, Recall, and Abstention."""
from typing import List, Dict, Any


class RetrievalEvaluator:
    """Evaluates the quality of codebase retrieval (AST chunks and vector matches)."""

    @staticmethod
    def is_hit(retrieved_items: List[Dict[str, Any]], expected_files: List[str], expected_symbols: List[str]) -> bool:
        """Determines if any retrieved item matches expected files or symbols."""
        if not expected_files and not expected_symbols:
            # Abstention case: query asks for non-existent code
            return len(retrieved_items) == 0

        norm_expected_files = [f.replace("\\", "/").lower() for f in expected_files]
        norm_expected_symbols = [s.lower() for s in expected_symbols]

        for item in retrieved_items:
            file_path = item.get("file_path", "").replace("\\", "/").lower()
            symbol = item.get("symbol_name", "").lower() or item.get("name", "").lower()

            if any(exp in file_path or file_path.endswith(exp) for exp in norm_expected_files):
                return True
            if any(sym in symbol for sym in norm_expected_symbols):
                return True
        return False

    @staticmethod
    def calculate_hit_rate(queries_results: List[Dict[str, Any]], k: int = 5) -> float:
        """Calculates Hit Rate @ K across all queries (excluding pure abstention)."""
        retrieval_queries = [qr for qr in queries_results if qr.get("expected_files") or qr.get("expected_symbols")]
        if not retrieval_queries:
            return 0.0

        hits = 0
        for qr in retrieval_queries:
            top_k = qr["retrieved"][:k]
            if RetrievalEvaluator.is_hit(top_k, qr["expected_files"], qr.get("expected_symbols", [])):
                hits += 1

        return round(hits / len(retrieval_queries), 4)

    @staticmethod
    def calculate_mrr(queries_results: List[Dict[str, Any]], k: int = 5) -> float:
        """Calculates Mean Reciprocal Rank (MRR @ K)."""
        retrieval_queries = [qr for qr in queries_results if qr.get("expected_files") or qr.get("expected_symbols")]
        if not retrieval_queries:
            return 0.0

        rr_sum = 0.0
        for qr in retrieval_queries:
            top_k = qr["retrieved"][:k]
            norm_expected_files = [f.replace("\\", "/").lower() for f in qr["expected_files"]]
            norm_expected_symbols = [s.lower() for s in qr.get("expected_symbols", [])]

            reciprocal_rank = 0.0
            for rank, item in enumerate(top_k, start=1):
                file_path = item.get("file_path", "").replace("\\", "/").lower()
                symbol = item.get("symbol_name", "").lower() or item.get("name", "").lower()

                match_file = any(exp in file_path or file_path.endswith(exp) for exp in norm_expected_files)
                match_symbol = any(sym in symbol for sym in norm_expected_symbols)

                if match_file or match_symbol:
                    reciprocal_rank = 1.0 / rank
                    break
            rr_sum += reciprocal_rank

        return round(rr_sum / len(retrieval_queries), 4)

    @staticmethod
    def calculate_precision_recall(queries_results: List[Dict[str, Any]], k: int = 5) -> Dict[str, float]:
        """Calculates Average Precision@K and Recall@K."""
        retrieval_queries = [qr for qr in queries_results if qr.get("expected_files")]
        if not retrieval_queries:
            return {"precision": 0.0, "recall": 0.0}

        precisions = []
        recalls = []

        for qr in retrieval_queries:
            top_k = qr["retrieved"][:k]
            expected = set(f.replace("\\", "/").lower() for f in qr["expected_files"])

            retrieved_files = set()
            for item in top_k:
                fp = item.get("file_path", "").replace("\\", "/").lower()
                for exp in expected:
                    if exp in fp or fp.endswith(exp):
                        retrieved_files.add(exp)

            matched_relevant = len(retrieved_files)
            precision = matched_relevant / len(top_k) if top_k else 0.0
            recall = matched_relevant / len(expected) if expected else 0.0

            precisions.append(precision)
            recalls.append(recall)

        return {
            "precision": round(sum(precisions) / len(precisions), 4),
            "recall": round(sum(recalls) / len(recalls), 4)
        }

    @staticmethod
    def calculate_abstention_accuracy(queries_results: List[Dict[str, Any]]) -> float:
        """Calculates accuracy on queries expecting abstention (non-existent code)."""
        abstention_queries = [qr for qr in queries_results if not qr.get("expected_files") and not qr.get("expected_symbols")]
        if not abstention_queries:
            return 1.0

        correct = 0
        for qr in abstention_queries:
            # Verified if answer explicitly mentions lack of code/not found or retrieved is empty
            answer = qr.get("answer", "").lower()
            if "not found" in answer or "does not contain" in answer or "no " in answer or not qr.get("retrieved"):
                correct += 1

        return round(correct / len(abstention_queries), 4)
