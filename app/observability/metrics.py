"""Prometheus metrics instrumentation for CodeBase."""
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import time
from contextlib import contextmanager

# 1. Request Counters
REQUESTS_TOTAL = Counter(
    "codebase_requests_total",
    "Total HTTP and agent requests processed",
    ["endpoint", "status"]
)

# 2. Latency Histograms
LATENCY_SECONDS = Histogram(
    "codebase_latency_seconds",
    "Latency of internal workflows in seconds",
    ["operation"],  # 'retrieval', 'graph_expansion', 'prompt_construction', 'llm_generation', 'output_validation', 'indexing'
    buckets=(0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0)
)

# 3. LLM TTFT (Time To First Token)
TTFT_SECONDS = Histogram(
    "codebase_llm_ttft_seconds",
    "Time to first token in streaming generation in seconds",
    ["model"],
    buckets=(0.05, 0.1, 0.2, 0.35, 0.5, 1.0, 2.0, 5.0)
)

# 4. LLM Generation Throughput
TOKENS_PER_SECOND = Histogram(
    "codebase_llm_tokens_per_second",
    "LLM token generation throughput",
    ["model"],
    buckets=(10, 25, 50, 75, 100, 150, 250, 500)
)

# 5. LLM Token Counters
LLM_TOKENS_TOTAL = Counter(
    "codebase_llm_tokens_total",
    "Total LLM tokens consumed",
    ["model", "token_type"]  # prompt or completion
)

# 6. Guardrail Violations
GUARDRAIL_VIOLATIONS_TOTAL = Counter(
    "codebase_guardrail_violations_total",
    "Count of requests intercepted by safety guardrails",
    ["guardrail_type"]  # 'prompt_injection', 'secret_leakage', 'citation_fail'
)

# 7. System Health / Active Repositories
ACTIVE_REPOSITORIES = Gauge(
    "codebase_active_repositories_total",
    "Number of indexed repositories currently active in storage"
)

# 8. Cache Hit Rate Gauge
CACHE_HIT_RATE = Gauge(
    "codebase_cache_hit_rate",
    "Current hit rate ratio of internal caches",
    ["cache_type"]  # 'embedding', 'summary'
)


class MetricsManager:
    """Helper wrapper for recording Prometheus telemetry across all request phases."""

    @staticmethod
    def record_request(endpoint: str, status: str = "success"):
        REQUESTS_TOTAL.labels(endpoint=endpoint, status=status).inc()

    @staticmethod
    def record_tokens(model: str, prompt_tokens: int, completion_tokens: int):
        if prompt_tokens > 0:
            LLM_TOKENS_TOTAL.labels(model=model, token_type="prompt").inc(prompt_tokens)
        if completion_tokens > 0:
            LLM_TOKENS_TOTAL.labels(model=model, token_type="completion").inc(completion_tokens)

    @staticmethod
    def record_ttft(model: str, ttft_sec: float):
        if ttft_sec > 0:
            TTFT_SECONDS.labels(model=model).observe(ttft_sec)

    @staticmethod
    def record_tokens_per_sec(model: str, tps: float):
        if tps > 0:
            TOKENS_PER_SECOND.labels(model=model).observe(tps)

    @staticmethod
    def record_guardrail_violation(guardrail_type: str):
        GUARDRAIL_VIOLATIONS_TOTAL.labels(guardrail_type=guardrail_type).inc()

    @staticmethod
    def record_latency(operation: str, elapsed_sec: float):
        LATENCY_SECONDS.labels(operation=operation).observe(elapsed_sec)

    @staticmethod
    def update_cache_hit_rate(cache_type: str, rate: float):
        CACHE_HIT_RATE.labels(cache_type=cache_type).set(rate)

    @staticmethod
    @contextmanager
    def measure_latency(operation: str):
        """Context manager to measure latency of an operation."""
        start_time = time.perf_counter()
        try:
            yield
        finally:
            elapsed = time.perf_counter() - start_time
            LATENCY_SECONDS.labels(operation=operation).observe(elapsed)

    @staticmethod
    def export_metrics() -> tuple[bytes, str]:
        """Exports metrics in Prometheus exposition format."""
        return generate_latest(), CONTENT_TYPE_LATEST


metrics = MetricsManager()
