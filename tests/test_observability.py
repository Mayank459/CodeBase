"""Unit tests for Observability (Metrics, Tracer, Structured Logger)."""
import pytest
from app.observability.metrics import metrics
from app.observability.tracer import tracer
from app.observability.logger import get_logger

def test_metrics_recording():
    # Test request counting
    metrics.record_request(endpoint="/agent/chat", status="success")
    metrics.record_request(endpoint="/agent/chat", status="blocked")
    
    # Test token counting
    metrics.record_tokens(model="gemini-flash", prompt_tokens=120, completion_tokens=85)

    # Test guardrail violation counting
    metrics.record_guardrail_violation("prompt_injection")
    metrics.record_guardrail_violation("secret_leakage")

    # Verify Prometheus output format
    raw_data, content_type = metrics.export_metrics()
    assert b"codebase_requests_total" in raw_data
    assert b"codebase_llm_tokens_total" in raw_data
    assert b"codebase_guardrail_violations_total" in raw_data
    assert "text/plain" in content_type

def test_tracer_spans():
    trace_id = tracer.start_trace()
    
    with tracer.span("retrieval_step", trace_id, attributes={"query": "find auth"}) as s1:
        assert s1.name == "retrieval_step"

    with tracer.span("llm_synthesis", trace_id, attributes={"model": "groq"}) as s2:
        assert s2.name == "llm_synthesis"

    spans = tracer.get_spans(trace_id)
    assert len(spans) == 2
    assert spans[0].duration_ms is not None
    assert spans[1].duration_ms is not None

def test_structured_logger():
    custom_logger = get_logger("test_logger")
    assert custom_logger is not None
