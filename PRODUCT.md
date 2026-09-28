# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **Reviewers of the work**: engineers, hiring managers, and recruiters who open the live Vercel link (https://code-base-self.vercel.app/) to judge what was built. They arrive cold and decide in the first minute whether this is a real system or a demo shell.
- **Developers using it**: engineers who point it at a GitHub repository to understand unfamiliar code, trace call paths, audit it, and get remediation PRs. They return to the workstation repeatedly and need it dense, fast, and scannable.

## Product Purpose

CodeBase indexes a repository into a structural knowledge base (tree-sitter AST symbols, a NetworkX call graph, and Cohere vector embeddings in Qdrant), then answers questions and runs analyses over it through LangGraph agents. Success: a visitor understands the mechanism within one viewport, and a developer gets a cited, line-accurate answer or a reviewable patch without leaving the workstation.

## Positioning

Answers are grounded in the parsed structure of the code (symbols and call edges), not only in text chunks. Every chat answer cites files and line ranges; the call graph lets the agents traverse callers and callees; remediation PRs pass a human-in-the-loop approval gate (LangGraph interrupt) before anything is published.

## Operating Context

- Workflow: ingest a repo (shallow clone → tree-sitter AST → entity extraction → call graph → embeddings → Qdrant) with live SSE progress, then work across nine tools.
- The nine tools: Intelligence Chat, Architecture call graph, Security Audit, Dead Code, Documentation generator, UML (Mermaid), Multi-Repo compare, Commit Evolution, Pull Request (HITL).
- Backend is FastAPI on Render's free tier; it cold-starts, so the UI shows keep-alive / latency state. Frontend is React 19 + Vite + Tailwind 3 on Vercel. Navigation is in-app state, not URL routes.
- Ctrl/Cmd+K command palette; default demo repo `psf/requests`.

## Capabilities and Constraints

- Full AST parsing is Python (tree-sitter-python); other languages go through a generic extractor. Do not claim multi-language AST parsing.
- LLM runtime: Gemini (gemini-3.6-flash) and Groq; embeddings: Cohere embed-english-light-v3.0 (384-d).
- 14 LangGraph agents under `app/agents` (router, chat, architecture, flow, security, security-fix, dead-code, documentation, UML, comparison, evolution, PR, await-approval, diagram).
- Guardrails for prompt injection and secret leakage exist on input/output.

## Brand Commitments

- Name: **CodeBase**.
- Keep the Matrixtype pixel typeface (`frontend/public/fonts/Matrixtype*`, regular/bold/display) as part of the identity.

## Evidence on Hand

- `evals_report.json` is **simulated, not a measurement**: `evals/run_evals.py` places the expected file at rank 1 by hand, templates the answers, and adds a fixed 12 ms latency. Its scores must not be shown as product metrics until a harness runs the real retrieval and chat pipeline.
- Indexed demo repo `psf/requests` (local run, 2026-09-28, after the parser fixes): 43 files, 568 entities, 1,059 graph nodes, 1,227 call edges of which 500 resolve to code in the repo. Live values come from the index API.
- Illustrations in `frontend/public/illustrations/` and `docs/illustrations/`.
- No customers, testimonials, pricing, or usage numbers exist. Never invent them. The former home-page figures (99.8% parse integrity, 87 ms p50, 128k context) were not measurements and must not return.

## Product Principles

1. Show the mechanism working instead of describing it: real symbols, real edges, real citations.
2. Every number on screen is measured or live; nothing decorative pretends to be data.
3. The workstation is a tool first: task, state, and results beat ornament.
4. A human approves before code changes leave the system.
