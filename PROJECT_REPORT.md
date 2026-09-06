# Codebase RAG Assistant — Project Report

> **The single living document for this project.** All setup, status, changelog, and iteration notes live here. Update this file after every iteration — do not create separate report files.

**Repository:** https://github.com/Mayank459/CodeBase
**Branch:** `main`
**Last updated:** 2026-09-06

---

## 1. What This Project Is

An open-source **Codebase RAG Assistant** — an AI-powered repository understanding & developer intelligence platform. Index any software repository, then interact with it in natural language: ask questions, trace call flows, audit security, generate documentation and UML diagrams, compare repositories, and review evolution over time.

---

## 2. Feature Overview

| Feature | Description |
|---|---|
| Repository Chat | Natural-language Q&A grounded in your codebase |
| Architecture Analysis | Structural breakdown: modules, classes, dependency graph |
| Call Flow Tracing | "What happens when X is called?" — graph-traced answer |
| Documentation Generation | Auto-generate structured Markdown docs |
| Security Audit | Detect hardcoded secrets, SQL injections, weak patterns |
| Security Fix Suggestions | AI-generated remediation with PR draft |
| Dead Code Detection | Find unused functions, classes, methods |
| UML Generation | Mermaid & PlantUML class/dependency/architecture diagrams |
| Multi-Repo Comparison | Compare architecture across indexed repositories |
| Repository Evolution | Diff two versions of a repo |
| Human-in-the-Loop (HITL) | Approve AI-generated patches before they become PRs |
| Reindexing | Force re-index with a `force` flag, bypassing the 24-hour cache; SSE progress streaming |

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Streamlit |
| Backend API | FastAPI |
| Agent Framework | LangGraph |
| Code Parsing | Tree-sitter |
| Vector Store | Qdrant |
| Dependency Graph | NetworkX |
| Embeddings | Cohere `embed-english-light-v3.0` (384-dim) |
| LLM | Groq (primary) / Gemini `gemini-3.6-flash` (fallback) |
| Containerization | Docker + Docker Compose |

---

## 4. Project Structure

```
codebase-rag-assistant/
├── main.py                     # FastAPI entry point
├── PROJECT_REPORT.md           # ← THE single living document (this file)
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── agent.py        # /agent/* endpoints (chat, approve, compare, evolution)
│   │   │   └── repository.py   # /repository/* endpoints (parse, index-stream, reindex, architecture)
│   │   └── schemas/            # Pydantic request/response models
│   ├── agents/                 # LangGraph nodes: router, chat, architecture, flow,
│   │                           # security, security_fix, dead_code, documentation,
│   │                           # uml, comparison, evolution, pr (HITL), await_approval
│   ├── analysis/               # Architecture, flow, dependency, security analyzers
│   ├── chat/                   # LLM provider, context builder, prompts
│   ├── core/                   # Config, constants, logging
│   ├── dead_code/              # Dead code static analyzer
│   ├── documentation/          # Doc generators
│   ├── embeddings/             # Cohere embedding service
│   ├── evolution/              # Repo diff & changelog generation
│   ├── graph/                  # NetworkX graph builder, resolver, visualizer
│   ├── hitl/                   # Human-in-the-Loop checkpoint store & resume handler
│   ├── indexing/               # Loader, scanner, index builder, entity extractor
│   ├── memory/                 # Conversation & repository session memory
│   ├── parsers/                # Tree-sitter parsers (Python + generic fallback)
│   ├── pr_generator/           # PR description & diff generation
│   ├── prompts/                # Centralized prompt templates
│   ├── retrieval/              # Semantic search, graph expansion, hybrid retriever
│   ├── security/               # Scanner, patch generator, report generator
│   ├── services/               # High-level repository indexer service
│   ├── storage/                # Qdrant client, vector store, repository registry
│   ├── streaming/              # SSE stream manager
│   ├── uml/                    # Mermaid & PlantUML generators
│   └── utils/                  # Shared utilities
├── streamlit_ui/
│   ├── app.py                  # Streamlit frontend (professional light theme)
│   ├── keep_alive.py           # Backend keep-alive daemon (pings every 5 min)
│   ├── run.sh / run.bat        # Startup scripts (auto-load .env)
│   ├── .streamlit/config.toml  # Theme + server config (24h session TTL)
│   └── requirements.txt        # UI dependencies
├── tests/                      # Smoke/probe scripts
├── docker-compose.yml          # Qdrant container
└── requirements.txt
```

---

## 5. Quick Start

### Prerequisites
- Python 3.11+ (tested on 3.12.9)
- Docker (for Qdrant)
- API keys: Groq (`GROQ_API_KEY`) or Google Gemini (`GEMINI_API_KEY`), Cohere (`COHERE_API_KEY`)

### Steps
```bash
git clone https://github.com/Mayank459/CodeBase
cd CodeBase
pip install -r requirements.txt

# .env file
GROQ_API_KEY=gsk_...      # optional primary LLM
GEMINI_API_KEY=...        # fallback / default LLM
COHERE_API_KEY=...        # embeddings
API_BASE=http://localhost:8000   # UI → backend URL

docker-compose up -d             # start Qdrant
uvicorn main:app --reload        # start backend    (port 8000)

cd streamlit_ui                  # start UI
run.bat            # Windows
# OR chmod +x run.sh && ./run.sh  # Mac/Linux
# OR: streamlit run app.py        # direct
```
Open **http://localhost:8501**.

---

## 6. API Reference

### Backend endpoints
```
GET  /                            # Health check
POST /repository/clone            # Clone a repository
POST /repository/scan             # Scan repository files
POST /repository/parse            # Full indexing pipeline (force flag bypasses cache)
POST /repository/index-stream     # Streaming indexing with progress (SSE)
POST /repository/reindex          # Force re-index, bypass 24h cache
POST /repository/reindex-stream   # SSE progress streaming reindex
POST /repository/architecture     # Raw architecture JSON (top_nodes, modules, graph_nodes, graph_edges)
POST /repository/debug-search     # Debug semantic search
POST /agent/chat                  # Full LangGraph agent (auto-routes by intent; history, thread_id)
POST /agent/chat-stream           # Streaming SSE chat
POST /agent/compare               # Compare multiple repositories
POST /agent/evolution             # Analyze changes between two repo versions
POST /agent/approve               # Approve/reject pending HITL action
```

### Chat request shape
```json
POST /agent/chat
{
  "repository_name": "CodeBase",
  "question": "What is this codebase?",
  "history": [{"role": "user", "content": "..."}],
  "thread_id": "test-1"
}
```

### Response example
```json
{
  "answer": "The main purpose of this codebase is to serve as an AI-powered repository understanding and developer intelligence platform called Codebase RAG Assistant..."
}
```

---

## 7. How the Agent Works

```
User Question
   ↓
FastAPI
   ↓
LangGraph ── router_node (intent detection)
   ├──▶ chat_node          → HybridRetriever + LLM
   ├──▶ architecture_node  → ArchitectureAnalyzer + LLM
   ├──▶ flow_node          → SemanticSearch + FlowAnalyzer + LLM
   ├──▶ security_node      → SecurityScanner + LLM
   ├──▶ dead_code_node     → DeadCodeAnalyzer + LLM
   ├──▶ documentation_node → RepositoryDocumentationGenerator
   ├──▶ uml_node           → MermaidGenerator / PlantUMLGenerator
   ├──▶ comparison_node    → RepositoryComparator
   ├──▶ evolution_node     → RepositoryDiffAnalyzer + LLM
   └──▶ pr_node            → SecurityScanner + PatchGenerator + interrupt() [HITL]
                                ↓
                         await_approval_node
                                ↓
                         POST /agent/approve
                                ↓
                         ResumeHandler → continues graph
```

---

## 8. LLM Provider (Groq + Gemini fallback)

**Primary:** Groq  →  `https://api.groq.com/openai/v1/chat/completions`, model `qwen/qwen3.8-27b`
**Fallback:** Google Gemini `gemini-3.6-flash` (always initialized)

Selection logic in `app/chat/llm_provider.py`:
```python
self.use_groq = bool(os.getenv("GROQ_API_KEY"))
# always init Gemini client for fallback
if self.use_groq:
    try:    return self._generate_groq(prompt)
    except Exception as e: return self._generate_gemini(prompt)   # graceful fallback
```

- `GROQ_API_KEY` / `GROK_API_KEY` — both accepted (backward compatible alias)
- `GROQ_MODEL` — optional, defaults to `qwen/qwen3.8-27b`
- Provider comparison: Groq = faster + cheaper, raises 400/429 errors; Gemini = excellent quality, free tier limited to ~20 req/day.

### Provider history (Git log summary)
| Commit | What changed |
|---|---|
| `9178794` | feat: dual-mode LLM provider (Grok with Gemini fallback) |
| `e350aa3` | feat: migrate from Gemini to Grok |
| `dde99d2` / `43fe3ab` | fix: disable Grok, graceful Gemini fallback on errors |
| `7bfd913` | fix: disable Grok due to 400 errors, Gemini primary |
| `742a801` | fix: update Gemini model to `gemini-3.6-flash`, re-enable Grok + fallback |
| `b3c4074` | feat: Groq API as primary LLM + Gemini fallback |

**Current state:** Groq primary, Gemini fallback — both chat and analysis features verified working.

---

## 9. Streamlit UI (2.0)

The UI was redesigned to be professional and business-appropriate, plus a backend keep-alive system.

### Professional theme
- Dark purple/neon → **professional light theme** (`#2c3e50` primary, `#f8f9fa` bg, white sidebar)
- All 50+ emojis removed from the interface
- Rebranded tabs: Chat, Architecture, Security, Dead Code, Documentation, UML Diagrams, Compare, Evolution, Pull Request
- Updated cards, badges, buttons, tabs, chat bubbles, inputs, code blocks

### Keep-alive system
- **`streamlit_ui/keep_alive.py`** — background daemon pinging backend every 5 minutes to prevent Render free-tier sleep (15-min inactivity threshold). Logs every ping with a timestamp; retries gracefully on error.
- **`.streamlit/config.toml`** — 24-hour disconnected-session TTL (`server.disconnectedSessionTTL = 86400`), max upload 100 MB, CORS enabled.
- Startup scripts `run.sh` / `run.bat` auto-load `.env` then launch Streamlit.

### Render deployment (UI)
1. New Web Service → connect GitHub repo
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `cd streamlit_ui && streamlit run app.py --server.port=8501 --server.address=0.0.0.0`
4. Env vars: `API_BASE`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `COHERE_API_KEY`
5. Keep-alive starts automatically with the app.

### Keep-alive monitoring
```
[2026-09-06 14:48:51] Keep-alive daemon started
[2026-09-06 14:48:51] Backend URL: http://localhost:8000
[2026-09-06 14:48:51] Ping interval: 300 seconds (5 minutes)
[2026-09-06 14:53:51] Backend ping successful (Status: 200)
```

---

## 10. Tests

Smoke/probe scripts in `tests/`:
```bash
python tests/test_parser.py
python tests/test_graph.py
python tests/test_entities.py
python tests/test_security.py
python tests/test_index_builder.py
# require live keys + Qdrant:
python tests/test_embeddings.py
python tests/test_qdrant.py
python tests/test_search.py
```

### Verification notes
- Chat (`POST /agent/chat`) and dead-code detection verified working; responses 400–7000 chars depending on the question.
- Indexing: CodeBase repo — ~180 files, ~340 entities parsed in ~50s.
- UI render test (AppTest): all 9 tabs, sidebar index input, chat form, and session state verified — no exceptions.
- Keep-alive functional test: `ping_backend()` returns True on 200, False on connection error; daemon thread non-blocking — verified.

---

## 11. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | optional | Groq LLM (primary if set) |
| `GROK_API_KEY` | optional | Backward-compatible alias for Groq |
| `GROQ_MODEL` | optional | Default `qwen/qwen3.8-27b` |
| `GEMINI_API_KEY` | ✅ | Google Gemini LLM (fallback / default) |
| `COHERE_API_KEY` | ✅ | Cohere embeddings |
| `API_BASE` | ⬜ | Backend URL override (default `http://localhost:8000`) |
| `QDRANT_URL` / `QDRANT_API_KEY` | ⬜ | Remote Qdrant (falls back to local) |

---

## 12. Docker

```bash
docker-compose up -d            # Qdrant only
open http://localhost:6333/dashboard   # Qdrant dashboard
```

---

## 13. Security Notes

- Never commit `.env` — add to `.gitignore`
- Use Render Secrets for prod env vars
- Enable HTTPS (Render provides free SSL)
- Add authentication if exposed publicly
- Validate all API responses

---

## 14. Changelog

### 2026-09-06 — Streamlit UI redesign + keep-alive (v2.0)
- Professional light theme; removed all emojis; rebranded tabs.
- Added `keep_alive.py`, `.streamlit/config.toml`, `run.sh`, `run.bat`.
- Fixed `config.toml`: replaced removed options `server.sessionExpirationSeconds`/`client.maxMessageSize` with valid `server.disconnectedSessionTTL` and `server.maxMessageSize`.
- Added `requests` to root `requirements.txt`.
- Verified: UI boots clean, health endpoint 200, AppTest 17/17, keep-alive functional tests pass. → **committed**

### 2026-09-05 — Reindexing feature
- Added `POST /repository/reindex` and `POST /repository/reindex-stream` (force flag bypasses 24h cache); merged `feature/reindexing`.

### 2026-09-05 — LLM provider fixes
- Upgraded Gemini model from deprecated `gemini-2.0-flash` → `gemini-3.6-flash`.
- Grok disabled due to 400 errors, re-enabled with graceful Gemini fallback.

---

*This single document replaces all prior scattered `.md`/`.txt` reports. Per project convention: after every iteration or update, edit this file's relevant section and append to the changelog — do not create new report files.*