"""Tracing and workflow span manager with OpenTelemetry integration for LLM and agent execution."""
import time
import uuid
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from contextlib import contextmanager

from app.observability.logger import logger
from app.observability.metrics import metrics

# Optional OpenTelemetry initialization
_otel_tracer = None
try:
    from opentelemetry import trace
    _otel_tracer = trace.get_tracer("codebase-ai-backend")
except Exception:
    _otel_tracer = None


@dataclass
class Span:
    name: str
    trace_id: str
    span_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    parent_id: Optional[str] = None
    start_time: float = field(default_factory=time.perf_counter)
    end_time: Optional[float] = None
    duration_ms: Optional[float] = None
    attributes: Dict[str, Any] = field(default_factory=dict)

    def finish(self):
        self.end_time = time.perf_counter()
        self.duration_ms = round((self.end_time - self.start_time) * 1000, 2)
        if self.duration_ms:
            metrics.record_latency(self.name, self.duration_ms / 1000.0)


class Tracer:
    """Production tracing manager supporting both OpenTelemetry and lightweight in-memory spans."""

    def __init__(self):
        self.active_spans: Dict[str, List[Span]] = {}

    def start_trace(self, trace_id: Optional[str] = None) -> str:
        tid = trace_id or str(uuid.uuid4())
        self.active_spans[tid] = []
        return tid

    @contextmanager
    def span(self, name: str, trace_id: str, attributes: Optional[Dict[str, Any]] = None):
        span_obj = Span(name=name, trace_id=trace_id, attributes=attributes or {})
        if trace_id not in self.active_spans:
            self.active_spans[trace_id] = []
        self.active_spans[trace_id].append(span_obj)

        otel_ctx = None
        if _otel_tracer:
            try:
                otel_ctx = _otel_tracer.start_as_current_span(name)
                otel_ctx.__enter__()
            except Exception:
                otel_ctx = None

        try:
            yield span_obj
        finally:
            if otel_ctx:
                try:
                    otel_ctx.__exit__(None, None, None)
                except Exception:
                    pass

            span_obj.finish()
            logger.info(
                f"Span '{name}' completed in {span_obj.duration_ms}ms",
                extra={
                    "trace_id": trace_id,
                    "duration_ms": span_obj.duration_ms,
                    **span_obj.attributes
                }
            )

    def get_spans(self, trace_id: str) -> List[Span]:
        return self.active_spans.get(trace_id, [])

    def get_trace_summary(self, trace_id: str) -> Dict[str, Any]:
        spans = self.get_spans(trace_id)
        return {
            "trace_id": trace_id,
            "total_spans": len(spans),
            "stages": [
                {
                    "name": s.name,
                    "duration_ms": s.duration_ms,
                    "attributes": s.attributes
                }
                for s in spans
            ]
        }


tracer = Tracer()
