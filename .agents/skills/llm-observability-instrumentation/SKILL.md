---
name: llm-observability-instrumentation
description: Guides the design and implementation of Prometheus telemetry, OpenTelemetry spans, latency histograms, token tracking, and structured logging in LLM applications.
---

# LLM Observability & Telemetry Instrumentation

This skill guides the agent to instrument production-grade telemetry, metrics, and distributed tracing across LLM pipelines, RAG retrievers, and agent workflows.

## When to Use
- When instrumenting an LLM or agent application with monitoring and metrics.
- When tracking token consumption, latency bottlenecks, and guardrail block counts.
- When setting up Prometheus scrape endpoints (`/metrics`) and structured JSON logs.

## Core Telemetry Metrics

### 1. Prometheus Metrics Specification
* **Request Counter**:
  ```python
  REQUESTS_TOTAL = Counter("app_requests_total", "Total requests", ["endpoint", "status"])
  ```
* **Latency Histogram**:
  ```python
  LATENCY_SECONDS = Histogram("app_latency_seconds", "Operation duration", ["operation"], buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0))
  ```
* **Token Counter**:
  ```python
  TOKENS_TOTAL = Counter("app_tokens_total", "Token usage", ["model", "type"])
  ```
* **Guardrail Violations**:
  ```python
  GUARDRAIL_VIOLATIONS = Counter("app_guardrail_violations_total", "Violations caught", ["violation_type"])
  ```

### 2. Distributed Tracing Spans
- Wrap retrieval, LLM synthesis, and post-processing in distinct spans:
  ```python
  with tracer.span("retrieval_step", trace_id):
      results = retriever.search(query)
  ```
- Attach token counts and model names to span metadata for easy trace visualization.

### 3. Structured JSON Logging
- Emit single-line JSON log records with standard keys:
  `timestamp`, `level`, `logger`, `message`, `request_id`, `trace_id`, `duration_ms`.
