"""LLM Output Evaluation Metrics: Faithfulness, Answer Relevancy, Citation Validity."""
import re
from typing import List, Dict, Any, Set

class LLMOutputEvaluator:
    """Evaluates generative LLM outputs for groundedness, citations, and relevancy."""

    @staticmethod
    def evaluate_citation_validity(
        answer: str,
        valid_repo_files: Set[str]
    ) -> Dict[str, Any]:
        """Calculates citation validity ratio against indexed repo files."""
        from app.guardrails.citation_validator import CitationValidatorGuardrail
        validator = CitationValidatorGuardrail()
        result = validator.validate(answer, indexed_files=valid_repo_files)

        total_citations = len(result.cited_files)
        valid_count = len(result.valid_citations)

        score = (valid_count / total_citations) if total_citations > 0 else 1.0
        return {
            "score": round(score, 4),
            "total_citations": total_citations,
            "valid_citations": result.valid_citations,
            "hallucinated_citations": result.hallucinated_citations,
        }

    @staticmethod
    def evaluate_faithfulness(
        answer: str,
        retrieved_contexts: List[str],
        ground_truth_keywords: List[str] = None
    ) -> float:
        """Evaluates whether key factual entities in the answer stem from retrieved context."""
        if not answer or not retrieved_contexts:
            return 0.0

        combined_context = " ".join(retrieved_contexts).lower()
        
        # Tokenize answer into meaningful keywords (len > 4)
        words = re.findall(r"\b[a-zA-Z_]{4,}\b", answer.lower())
        if not words:
            return 1.0

        grounded_count = sum(1 for w in words if w in combined_context)
        base_faithfulness = grounded_count / len(words)

        # Boost if ground truth keywords are preserved
        if ground_truth_keywords:
            preserved_gt = sum(1 for kw in ground_truth_keywords if kw.lower() in answer.lower())
            gt_ratio = preserved_gt / len(ground_truth_keywords)
            return round(0.5 * base_faithfulness + 0.5 * gt_ratio, 4)

        return round(base_faithfulness, 4)

    @staticmethod
    def evaluate_answer_relevancy(
        query: str,
        answer: str
    ) -> float:
        """Evaluates lexical and semantic query-answer alignment."""
        if not query or not answer:
            return 0.0

        query_tokens = set(re.findall(r"\b[a-zA-Z_]{3,}\b", query.lower()))
        if not query_tokens:
            return 1.0

        answer_lower = answer.lower()
        matched = sum(1 for token in query_tokens if token in answer_lower)
        return round(matched / len(query_tokens), 4)
