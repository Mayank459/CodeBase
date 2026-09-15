"""Tracing and workflow span manager for LLM and agent execution."""
import time
import uuid
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from contextlib import contextmanager

from app.observability.logger import logger
from app.observability.metrics import metrics

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
        # Record Prometheus latency metric
        if self.duration_ms:
            metrics.measure_latency(self.name)

class Tracer:
    """Lightweight in-memory tracing manager for agent workflows."""

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

        try:
            yield span_obj
        finally:
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

tracer = Tracer()
