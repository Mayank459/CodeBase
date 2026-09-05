# 🧠 Codebase RAG Assistant

> **AI-Powered Repository Understanding & Developer Intelligence Platform**

An open-source system that lets developers interact with large software repositories using **natural language**. Index any codebase, then ask questions, trace call flows, generate documentation, audit security, and more — all through a conversational interface.

---

## ✨ Features

| Feature | Description |
|---|---|
| **💬 Repository Chat** | Natural language Q&A grounded in your codebase |
| **🏗️ Architecture Analysis** | Structural breakdown: modules, classes, dependency graph |
| **🔄 Call Flow Tracing** | "What happens when X is called?" — graph-traced answer |
| **📄 Documentation Generation** | Auto-generate structured Markdown docs for all files |
| **🔒 Security Audit** | Detect hardcoded secrets, SQL injections, weak patterns |
| **🛠️ Security Fix Suggestions** | AI-generated remediation patches with PR draft |
| **🗑️ Dead Code Detection** | Find unused functions, classes, and methods |
| **📐 UML Generation** | Mermaid & PlantUML class/dependency/architecture diagrams |
| **🔁 Multi-Repo Comparison** | Compare architecture across multiple indexed repositories |
| **📈 Repository Evolution** | Diff two versions of a repo to see what changed |
| **👁️ Human-in-the-Loop (HITL)** | Approve AI-generated patches before they become PRs |

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Streamlit |
| **Backend API** | FastAPI |
| **Agent Framework** | LangGraph |
| **Code Parsing** | Tree-sitter |
| **Vector Store** | Qdrant |
| **Dependency Graph** | NetworkX |
| **Embeddings** | Cohere embed-english-light-v3.0 (384-dim) |
| **LLM** | Google Gemini 2.5 Flash |
| **Containerization** | Docker + Docker Compose |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Docker (for Qdrant)
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com/)
- A **Cohere API key** (for embeddings) from [Cohere](https://dashboard.cohere.com/)

### 1. Clone & install

```bash
git clone https://github.com/your-username/codebase-rag-assistant
cd codebase-rag-assistant
pip install -r requirements.txt
```

### 2. Set environment variables

```bash
# .env
GEMINI_API_KEY=your_key_here
COHERE_API_KEY=your_key_here
```

### 3. Start Qdrant

```bash
docker-compose up -d
```

### 4. Start the FastAPI backend

```bash
uvicorn main:app --reload
```

### 5. Start the Streamlit UI

```bash
streamlit run streamlit_ui/app.py
```

Open **http://localhost:8501** in your browser.

---

## 🗂️ Project Structure

```
codebase-rag-assistant/
├── main.py                     # FastAPI entry point
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── agent.py        # /agent/* endpoints (chat, approve, compare, evolution)
│   │   │   └── repository.py   # /repository/* endpoints (clone, scan, parse, chat)
│   │   └── schemas/            # Pydantic request/response models
│   ├── agents/
│   │   ├── graph_builder.py    # LangGraph compilation
│   │   ├── router.py           # Intent-based routing node
│   │   ├── state.py            # AgentState TypedDict
│   │   ├── chat_agent.py       # General Q&A
│   │   ├── architecture_agent.py
│   │   ├── flow_agent.py       # Call-flow tracing
│   │   ├── security_agent.py
│   │   ├── security_fix_agent.py
│   │   ├── dead_code_agent.py
│   │   ├── documentation_agent.py
│   │   ├── uml_agent.py
│   │   ├── comparison_agent.py
│   │   ├── evolution_agent.py
│   │   ├── pr_agent.py         # PR generation with HITL
│   │   └── await_approval_agent.py
│   ├── analysis/               # Architecture, flow, dependency, security analyzers
│   ├── chat/                   # LLM provider, context builder, prompts
│   ├── core/                   # Config, constants, logging
│   ├── dead_code/              # Dead code static analyzer
│   ├── documentation/          # Doc generators for classes, functions, repos
│   ├── embeddings/             # Cohere embedding service
│   ├── evolution/              # Repo diff & changelog generation
│   ├── graph/                  # NetworkX graph builder, resolver, visualizer
│   ├── hitl/                   # Human-in-the-Loop: checkpoint store & resume handler
│   ├── indexing/               # Repository loader, scanner, index builder, entity extractor
│   ├── memory/                 # Conversation & repository session memory
│   ├── parsers/                # Tree-sitter parsers (Python + generic fallback)
│   ├── pr_generator/           # PR description & diff generation
│   ├── prompts/                # Centralized prompt templates
│   ├── retrieval/              # Semantic search, graph expansion, hybrid retriever
│   ├── security/               # Security scanner, patch generator, report generator
│   ├── services/               # High-level repository indexer service
│   ├── storage/                # Qdrant client, vector store, repository registry
│   ├── streaming/              # SSE stream manager
│   ├── uml/                    # Mermaid & PlantUML generators
│   └── utils/                  # Shared utilities
├── streamlit_ui/
│   └── app.py                  # Full Streamlit frontend
├── tests/                      # Pytest test suite
├── docker-compose.yml          # Qdrant container
├── requirements.txt
└── README.md
```

---

## 📡 API Reference

### Repository Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/repository/parse` | Index a repository (clone → parse → embed → store) |
| `POST` | `/repository/index-stream` | Index with SSE progress streaming (used by UI) |
| `POST` | `/repository/chat` | Direct chat (bypasses agent graph) |
| `POST` | `/repository/architecture` | Raw architecture analysis JSON |
| `POST` | `/repository/debug-search` | Debug semantic search results |

### Agent Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/agent/chat` | Full LangGraph agent (auto-routes by intent). Accepts `history` (list of `{role, content}`) for conversational context and `thread_id` for HITL resume |
| `POST` | `/agent/chat-stream` | Streaming SSE version of chat |
| `POST` | `/agent/compare` | Compare multiple repositories |
| `POST` | `/agent/evolution` | Analyze changes between two repo versions |
| `POST` | `/agent/approve` | Approve/reject a pending HITL action (resumes the paused graph via thread_id) |

---

## 🤖 How It Works

```
User Question
     │
     ▼
  FastAPI
     │
     ▼
 LangGraph
     │
  router_node  (keyword-based intent detection)
     │
     ├──▶ chat_node          → HybridRetriever + Gemini
     ├──▶ architecture_node  → ArchitectureAnalyzer + Gemini
     ├──▶ flow_node          → SemanticSearch + FlowAnalyzer + Gemini
     ├──▶ security_node      → SecurityScanner + Gemini
     ├──▶ dead_code_node     → DeadCodeAnalyzer + Gemini
     ├──▶ documentation_node → RepositoryDocumentationGenerator
     ├──▶ uml_node           → MermaidGenerator / PlantUMLGenerator
     ├──▶ comparison_node    → RepositoryComparator
     ├──▶ evolution_node     → RepositoryDiffAnalyzer + Gemini
     └──▶ pr_node            → SecurityScanner + PatchGenerator + interrupt() [HITL]
                                      │
                               await_approval_node
                                      │
                               POST /agent/approve
                                      │
                               ResumeHandler → continues graph
```

---

## 🧪 Running Tests

The `tests/` directory contains quick smoke/probe scripts (not a full pytest suite).

```bash
# Offline smoke scripts (parser, graph, entities, security, index builder)
python tests/test_parser.py
python tests/test_graph.py
python tests/test_entities.py
python tests/test_security.py
python tests/test_index_builder.py

# These require a live Cohere API key + running Qdrant
python tests/test_embeddings.py
python tests/test_qdrant.py
python tests/test_search.py
```

---

## 🐳 Docker

```bash
# Start Qdrant only
docker-compose up -d

# Check Qdrant dashboard
open http://localhost:6333/dashboard
```

---

## 📋 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key (LLM) |
| `COHERE_API_KEY` | ✅ | Cohere API key (embeddings) |
| `API_BASE` | ⬜ | Override backend URL (default `http://localhost:8000`) |
| `QDRANT_URL` / `QDRANT_API_KEY` | ⬜ | Remote Qdrant (falls back to local in-memory + disk) |

---

## 📝 License

MIT License — free to use, modify, and distribute.

---

## 🙌 Contributing

PRs welcome! Please open an issue first to discuss what you'd like to change.
