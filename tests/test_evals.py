"""Unit tests for Evals (Retrieval and LLM metrics)."""
import pytest
from evals.retrieval_eval import RetrievalEvaluator
from evals.llm_eval import LLMOutputEvaluator

def test_retrieval_eval_hit_rate_and_mrr():
    sample_results = [
        {
            "query": "Where is main app?",
            "expected_files": ["main.py"],
            "expected_symbols": ["app"],
            "retrieved": [
                {"file_path": "main.py", "symbol_name": "app"},
                {"file_path": "other.py", "symbol_name": "foo"}
            ]
        },
        {
            "query": "Where is parser?",
            "expected_files": ["parser.py"],
            "expected_symbols": ["parse"],
            "retrieved": [
                {"file_path": "wrong.py", "symbol_name": "wrong"},
                {"file_path": "parser.py", "symbol_name": "parse"}
            ]
        }
    ]

    hit_rate_1 = RetrievalEvaluator.calculate_hit_rate(sample_results, k=1)
    assert hit_rate_1 == 0.5  # 1st query hit at rank 1, 2nd query at rank 2

    hit_rate_2 = RetrievalEvaluator.calculate_hit_rate(sample_results, k=2)
    assert hit_rate_2 == 1.0  # Both hit by rank 2

    mrr = RetrievalEvaluator.calculate_mrr(sample_results, k=2)
    # Query 1: 1/1 = 1.0, Query 2: 1/2 = 0.5 -> Mean = 0.75
    assert mrr == 0.75

def test_llm_eval_faithfulness():
    answer = "The server is initialized in `main.py` using FastAPI."
    context = ["In `main.py`, the application uses FastAPI to create the web server."]
    score = LLMOutputEvaluator.evaluate_faithfulness(answer, context)
    assert score > 0.5

def test_llm_eval_citation_validity():
    answer = "See `app/api/routes/agent.py` and `app/parsers/python/extractor.py`."
    known_files = {"app/api/routes/agent.py", "app/parsers/python/extractor.py"}
    res = LLMOutputEvaluator.evaluate_citation_validity(answer, known_files)
    assert res["score"] == 1.0
    assert len(res["hallucinated_citations"]) == 0
