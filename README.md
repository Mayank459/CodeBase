# Codebase RAG Assistant

AI-powered repository understanding and developer intelligence platform. Index any codebase, then interact with it in natural language -- ask questions, trace call flows, audit security, generate documentation, and more.

---

## Features

- **Repository Chat** -- Natural language Q&A grounded in your indexed codebase
- **Architecture Analysis** -- Structural breakdown: modules, classes, dependency graph
- **Call Flow Tracing** -- "What happens when X is called?" answered via graph traversal
- **Documentation Generation** -- Auto-generate structured Markdown docs for classes and functions
- **Security Audit** -- Detect hardcoded secrets, SQL injections, weak patterns
- **Security Fix Suggestions** -- AI-generated remediation patches with PR draft
- **Dead Code Detection** -- Identify unused functions, classes, and methods
- **UML Generation** -- Mermaid and PlantUML class, dependency, and architecture diagrams
- **Multi-Repo Comparison** -- Compare architecture across multiple indexed repositories
- **Repository Evolution** -- Diff two versions of a repository to see what changed
- **Human-in-the-Loop** -- Approve AI-generated patches before they become pull requests
- **Reindexing** -- Force re-index with a flag, bypassing the 24-hour cache; SSE progress streaming

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Streamlit (GitHub Dark theme, inline Mermaid diagrams) |
| Backend API | FastAPI |
| Agent Framework | LangGraph |
| Code Parsing | Tree-sitter |
| Vector Store | Qdrant |
| Dependency Graph | NetworkX |
| Embeddings | Cohere embed-english-light-v3.0 (384-dim) |
| LLM | Groq (primary) / Google Gemini (fallback) |
| Containerization | Docker + Docker Compose |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Docker (for Qdrant)
- API keys:
  - `GROQ_API_KEY` -- Groq LLM (primary, optional)
  - `GEMINI_API_KEY` -- Google Gemini LLM (fallback / default)
  - `COHERE_API_KEY` -- Cohere embeddings

### 1. Clone and install

```bash
git clone https://github.com/Mayank459/CodeBase
cd CodeBase
pip install -r requirements.txt
```

### 2. Set environment variables

```bash
# Create a .env file in the project root
GROQ_API_KEY=gsk_your_key
GEMINI_API_KEY=your_gemini_key
COHERE_API_KEY=your_cohere_key
API_BASE=http://localhost:8000
```

### 3. Start Qdrant

```bash
docker-compose up -d
```

### 4. Start the backend

```bash
uvicorn main:app --reload
```

### 5. Start the UI

```bash
cd streamlit_ui
# Windows:
run.bat
# Mac/Linux:
chmod +x run.sh && ./run.sh
# Or directly:
streamlit run app.py
```

Open **http://localhost:8501** in your browser.

---

## Project Structure

```
CodeBase/
├── main.py                          # FastAPI entry point
├── requirements.txt                 # Python dependencies
├── docker-compose.yml               # Qdrant container
├── PROJECT_REPORT.md                # Full project docs and changelog
├── app/
│   ├── api/routes/                  # Repository and agent endpoints
│   ├── agents/                      # LangGraph nodes and graph builder
│   ├── analysis/                    # Architecture, flow, security analyzers
│   ├── chat/                        # LLM provider (Groq + Gemini), prompts
│   ├── core/                        # Config, constants, logging
│   ├── embeddings/                  # Cohere embedding service
│   ├── graph/                       # NetworkX graph builder and resolver
│   ├── hitl/                        # Human-in-the-Loop checkpoint and resume
│   ├── indexing/                    # Repo loader, scanner, entity extractor
│   ├── memory/                      # Conversation and session memory
│   ├── parsers/                     # Tree-sitter parsers
│   ├── retrieval/                   # Semantic search, hybrid retriever
│   ├── security/                    # Scanner, patch generator
│   ├── services/                    # Repository indexer service
│   ├── storage/                     # Qdrant client, vector store
│   └── uml/                         # Mermaid and PlantUML generators
├── streamlit_ui/
│   ├── app.py                       # Streamlit frontend
│   ├── keep_alive.py                # Backend keep-alive daemon
│   ├── run.sh / run.bat             # Startup scripts
│   └── .streamlit/config.toml       # Theme and server config
└── tests/                           # Smoke and probe scripts
```

---

## API Reference

### Repository Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /repository/parse | Index a repository (with optional `force` flag) |
| POST | /repository/index-stream | Index with SSE progress streaming |
| POST | /repository/reindex | Force re-index, bypass 24-hour cache |
| POST | /repository/reindex-stream | Re-index with SSE progress |
| POST | /repository/architecture | Architecture analysis JSON |

### Agent Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /agent/chat | Full LangGraph agent with intent routing |
| POST | /agent/chat-stream | Streaming SSE chat |
| POST | /agent/compare | Compare multiple repositories |
| POST | /agent/evolution | Analyze changes between two repo versions |
| POST | /agent/approve | Approve or reject a HITL action |

---

## Deployment (Render)

1. Create a new Web Service on [Render](https://dashboard.render.com)
2. Build command: `pip install -r requirements.txt`
3. Start command: `cd streamlit_ui && streamlit run app.py --server.port=8501 --server.address=0.0.0.0`
4. Add environment variables: `API_BASE`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `COHERE_API_KEY`
5. Deploy -- keep-alive daemon starts automatically

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | No | Groq LLM API key (primary if set) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key (fallback) |
| `COHERE_API_KEY` | Yes | Cohere API key (embeddings) |
| `API_BASE` | No | Backend URL override (default: http://localhost:8000) |
| `QDRANT_URL` | No | Remote Qdrant URL (default: local in-memory + disk) |

---

## License

MIT License -- free to use, modify, and distribute.
