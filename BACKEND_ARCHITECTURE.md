# CodeBase Backend Architecture & System Internals

> **Comprehensive Engineering Specification & Flowchart Guide**  
> *Platform:* CodeBase RAG Assistant — AI-Powered Repository Understanding & Developer Intelligence  
> *Target Audience:* Backend Engineers, System Architects, Security Auditors, AI Engineers  
> *Stack:* FastAPI, LangGraph, NetworkX, Qdrant, Tree-Sitter, Cohere Embeddings, Groq LPU, Gemini Fallback, Prometheus

---

## Table of Contents
1. [System Architectural Overview](#1-system-architectural-overview)
2. [End-to-End System Topology (Flowchart)](#2-end-to-end-system-topology-flowchart)
3. [Repository Ingestion & AST Parsing Pipeline](#3-repository-ingestion--ast-parsing-pipeline)
   - 3.1 The 9-Stage Ingestion Lifecycle
   - 3.2 Tree-Sitter AST Code Extraction
   - 3.3 Ingestion Pipeline Flowchart
4. [Graph Engine & NetworkX Topology](#4-graph-engine--networkx-topology)
   - 4.1 Node & Edge Schema
   - 4.2 Graph Algorithms & Traversal
5. [Graph-Augmented Hybrid Retrieval (Vector + Graph)](#5-graph-augmented-hybrid-retrieval-vector--graph)
   - 5.1 Why Pure Vector Search Fails in Codebases
   - 5.2 Two-Phase Retrieval Lifecycle (Sequence Diagram)
   - 5.3 Context Expansion Algorithm
6. [LangGraph Multi-Agent Orchestration Subsystem](#6-langgraph-multi-agent-orchestration-subsystem)
   - 6.1 Agent State Definition (`AgentState`)
   - 6.2 Intelligent Router & Decision Matrix
   - 6.3 Complete Multi-Agent State Machine (Flowchart)
   - 6.4 The 12 Specialized Agent Nodes
7. [Human-in-the-Loop (HITL) PR Creation Gate](#7-human-in-the-loop-hitl-pr-creation-gate)
   - 7.1 LangGraph Interrupt & Resume Lifecycle
   - 7.2 HITL Workflow (Sequence Diagram)
8. [Dual-Layer Enterprise Guardrails](#8-dual-layer-enterprise-guardrails)
   - 8.1 Input Sanitization & Prompt Injection Defense
   - 8.2 Output Secret Scrubbing & Citation Grounding
   - 8.3 Guardrails Execution Flowchart
9. [Real-Time SSE Streaming & Concurrency Architecture](#9-real-time-sse-streaming--concurrency-architecture)
10. [Observability, Prometheus Metrics & Audit Telemetry](#10-observability-prometheus-metrics--audit-telemetry)
11. [Module Directory & File Responsibility Directory](#11-module-directory--file-responsibility-directory)
12. [Backend Optimization & Improvement Roadmap](#12-backend-optimization--improvement-roadmap)

---

## 1. System Architectural Overview

CodeBase RAG Assistant is built upon a **Hybrid Code-RAG paradigm** that unifies three distinct representation layers for any indexed software repository:

1. **Syntactic Layer (Tree-Sitter ASTs):** Parses source files into Abstract Syntax Trees, capturing classes, functions, parameters, docstrings, imports, and call signatures without relying on regular expressions.
2. **Relational Layer (NetworkX Directed Graph):** Represents codebases as typed multi-graphs where nodes are code entities (`file`, `class`, `function`, `route`) and edges represent semantic relationships (`CALLS`, `IMPORTS`, `DEFINES`).
3. **Semantic Layer (Qdrant Vector Store + Cohere Embeddings):** Converts entity docstrings, signatures, and implementation snippets into 384-dimensional dense vectors using Cohere's `embed-english-light-v3.0`.

Orchestrating these layers is a **Stateful Multi-Agent Engine powered by LangGraph**, featuring an intent-based router, 12 specialized worker agents, dual-layer guardrails, and Human-in-the-Loop approval checkpointers.

---

## 2. End-to-End System Topology (Flowchart)

The following diagram illustrates the complete end-to-end request and data processing pipeline across the CodeBase backend:

```mermaid
flowchart TD
    subgraph CLIENT["Client Tier (Web Browser / API Consumer)"]
        UI["React + Vite UI"]
        SSE["SSE EventSource Stream"]
    end

    subgraph GATEWAY["FastAPI Gateway Tier"]
        MID["Correlation ID Middleware (X-Request-ID)"]
        CORS["CORS & Origin Validation"]
        ROUTER_API["API Route Dispatcher"]
        METRICS_EP["/metrics (Prometheus)"]
    end

    subgraph REPO_SVC["Repository Ingestion Subsystem"]
        CLONE["Git Shallow Cloner (depth=1)"]
        SCAN["File Scanner & Noise Filter"]
        AST["Tree-Sitter AST Parsers (.py, .js, .ts)"]
        GRAPH_BLD["NetworkX DiGraph Builder"]
        ENTITY_EXT["Code Entity Extractor"]
        COHERE["Cohere Embeddings (384-dim)"]
    end

    subgraph STORAGE["Persistence & Registry Tier"]
        QDRANT[("Qdrant Vector DB (Cosine Distance)")]
        REGISTRY[("In-Memory & Disk Repo Registry")]
        MEMORY_SAVER[("LangGraph MemorySaver Checkpointer")]
    end

    subgraph AGENT_TIER["LangGraph Multi-Agent Engine"]
        IN_GUARD["Input Guardrail (Injection & Sanitization)"]
        ROUTER_NODE{"Intent Router Node"}
        
        CHAT_NODE["Chat RAG Agent"]
        ARCH_NODE["Architecture Analyzer"]
        FLOW_NODE["Call Flow Tracer"]
        SEC_NODE["Security Auditor"]
        DEAD_NODE["Dead Code Detector"]
        UML_NODE["Mermaid UML Generator"]
        COMPARE_NODE["Repo Comparator"]
        EVO_NODE["Evolution Tracker"]
        HITL_NODE["HITL Approval Gate"]
        PR_NODE["PR Generator"]
        
        OUT_GUARD["Output Guardrail (Secret Scrub + Citation Grounding)"]
    end

    subgraph LLM_TIER["Inference Providers"]
        GROQ["Groq LPU (Llama-3.3-70b-versatile)"]
        GEMINI["Google Gemini 1.5 (Fallback Engine)"]
    end

    %% Client Interactions
    UI -->|HTTP POST| MID
    MID --> CORS --> ROUTER_API
    UI -.->|SSE Subscription| SSE
    SSE -.->|Listen to Streams| ROUTER_API

    %% Gateway Routing
    ROUTER_API -->|/repository/*| REPO_SVC
    ROUTER_API -->|/agent/*| IN_GUARD
    ROUTER_API --> METRICS_EP

    %% Ingestion Pipeline Flow
    CLONE --> SCAN --> AST --> GRAPH_BLD --> ENTITY_EXT --> COHERE
    COHERE -->|Store Vectors| QDRANT
    GRAPH_BLD -->|Register Graph| REGISTRY
    ENTITY_EXT -->|Register Metadata| REGISTRY

    %% Agent Pipeline Flow
    IN_GUARD --> ROUTER_NODE
    ROUTER_NODE -->|Q&A| CHAT_NODE
    ROUTER_NODE -->|Structure| ARCH_NODE
    ROUTER_NODE -->|Execution Trace| FLOW_NODE
    ROUTER_NODE -->|Vulnerabilities| SEC_NODE
    ROUTER_NODE -->|Unused Code| DEAD_NODE
    ROUTER_NODE -->|Diagrams| UML_NODE
    ROUTER_NODE -->|Cross-Repo| COMPARE_NODE
    ROUTER_NODE -->|Commit Drift| EVO_NODE
    ROUTER_NODE -->|Patch Approval| HITL_NODE
    HITL_NODE -->|Approved| PR_NODE

    %% Data Retrieval by Agents
    CHAT_NODE <-->|Hybrid Search| QDRANT
    CHAT_NODE <-->|Neighborhood BFS| REGISTRY
    FLOW_NODE <-->|Call Graph Queries| REGISTRY
    DEAD_NODE <-->|Degree Centrality| REGISTRY

    %% LLM Invocations
    CHAT_NODE & ARCH_NODE & SEC_NODE & UML_NODE --> GROQ
    GROQ -.->|Failover| GEMINI

    %% Agent Outputs to Guardrails
    CHAT_NODE & ARCH_NODE & FLOW_NODE & SEC_NODE --> OUT_GUARD
    OUT_GUARD -->|Sanitized JSON / Stream| UI
```

---

## 3. Repository Ingestion & AST Parsing Pipeline

The ingestion subsystem (`app/services/repository_indexer.py`) converts arbitrary Git repositories or local source trees into queryable graphs and vector embeddings.

### 3.1 The 9-Stage Ingestion Lifecycle

```
[0. Cache Check] ──► [1. Shallow Clone] ──► [2. File Scanner] ──► [3. Tree-Sitter AST]
                                                                         │
[7. Qdrant Store] ◄── [6. Cohere Embed] ◄── [5. Entity Extract] ◄── [4. Graph Builder]
        │
        ▼
[8. Registry Register] ──► [9. Raw File Cleanup] ──► [Completed Result]
```

1. **Cache Verification (`repository_registry.contains`):** Checks if the repository is already indexed. If indexed and `force=False`, loads instantly from cached memory/disk. If `force=True`, purges existing Qdrant vector collections and graph caches.
2. **Shallow Clone (`app/indexing/repository_loader.py`):** Uses GitPython to execute a shallow clone (`depth=1`), fetching only the latest revision. Minimizes network transfer and storage.
3. **Scanner & Noise Filter (`app/indexing/scanner.py`):** Traverses the repository tree, filtering out:
   - Dependency folders: `node_modules`, `venv`, `.tox`, `site-packages`
   - Cache artifacts: `__pycache__`, `.pytest_cache`, `.mypy_cache`
   - Build outputs: `dist`, `build`, `out`, `target`
   - Binaries & media: `.png`, `.jpg`, `.pdf`, `.zip`, `.pyc`, `.exe`
   - Size limit: Files exceeding 100 KB are excluded to prevent vector store pollution.
4. **Tree-Sitter AST Parsing (`app/parsers/`):** Reads files and invokes registered parsers (`PARSER_REGISTRY`) based on file extension. Extracts structured ASTs for Python, JavaScript, TypeScript, JSX, and TSX. Source text is capped at 8,000 characters per file.
5. **Graph Construction (`app/indexing/index_builder.py`):** Instantiates a `RepositoryIndex` containing a NetworkX directed graph (`DiGraph`). Creates nodes for files, functions, and classes, and adds edges for call relationships and imports.
6. **Entity Extraction (`app/indexing/models/entity_extractor.py`):** Extracts discrete, semantically rich code units (`CodeEntity`) with:
   - Entity type (`function`, `class`, `method`, `endpoint`)
   - Signature (arguments, return types)
   - Docstrings and body snippets
   - Line number ranges and file paths
   - Injects a synthesized `RepositorySummarizer` entity for high-level repository grounding.
7. **Cohere Embeddings (`app/embeddings/embedding_service.py`):** Generates 384-dimensional dense embeddings for all extracted code entities in concurrent batches using Cohere's `embed-english-light-v3.0`.
8. **Vector Store Upsert (`app/storage/vector_store.py`):** Ensures a Qdrant collection exists (`codebase_entities` with Cosine distance) and upserts vector points with rich payloads (entity name, code content, file path, repository tag).
9. **Registry & Ephemeral Cleanup:** Stores the `RepositoryIndex` in `RepositoryRegistry` and cleans up temporary local Git checkout files to prevent disk exhaustion.

---

### 3.2 Tree-Sitter AST Code Extraction

Unlike naive chunking (splitting code every 500 characters), AST parsing preserves syntactic boundaries:

```python
# Conceptual representation of Tree-Sitter AST Extraction
class PythonParser:
    def extract(self, file_path: str, code: str) -> ParsedFile:
        tree = self.tree_sitter_parser.parse(bytes(code, "utf8"))
        functions = self._query_nodes(tree.root_node, "(function_definition) @func")
        classes = self._query_nodes(tree.root_node, "(class_definition) @class")
        calls = self._query_nodes(tree.root_node, "(call function: (identifier) @called)")
        return ParsedFile(path=file_path, functions=functions, classes=classes, calls=calls)
```

**Key Benefit:** Chunks always correspond to complete functions or classes. Embeddings represent semantic units rather than arbitrary slice fragments.

---

### 3.3 Ingestion Pipeline Flowchart

```mermaid
flowchart TD
    START([POST /repository/index-stream]) --> CACHE_CHECK{Repository Already in Registry?}
    
    CACHE_CHECK -- Yes & force=False --> CACHE_HIT[Load from Registry & Return Instantly]
    CACHE_CHECK -- Yes & force=True --> PURGE[Purge Qdrant Vectors & Old Graph]
    CACHE_CHECK -- No --> CLONE
    PURGE --> CLONE

    subgraph INGESTION_STAGES["Ingestion Pipeline Execution"]
        CLONE["1. Git Shallow Clone (depth=1)"]
        CLONE --> SCAN["2. File Scanner (Filter 100KB+, binaries, node_modules)"]
        SCAN --> PARSE["3. Tree-Sitter AST Parsing (Extract funcs, classes, calls)"]
        PARSE --> GRAPH["4. Build NetworkX Dependency Graph"]
        GRAPH --> EXTRACT["5. Extract CodeEntities + Repo Summary"]
        EXTRACT --> EMBED["6. Cohere Embedding Batches (384-dim, light-v3.0)"]
        EMBED --> STORE["7. Upsert Vector Points to Qdrant (codebase_entities)"]
        STORE --> REG["8. Register Index in RepositoryRegistry"]
        REG --> CLEANUP["9. Delete Cloned Local Files (Save Disk)"]
    end

    CLEANUP --> DONE([SSE Event 'done' with Stats & Node Counts])
```

---

## 4. Graph Engine & NetworkX Topology

The relational backbone of the backend is an in-memory NetworkX directed graph (`networkx.DiGraph`).

### 4.1 Node & Edge Schema

#### Nodes
Nodes represent discrete architectural entities:
- **`file`:** Represents a source module (e.g., `app/api/routes/agent.py`). Attributes: `lines_of_code`, `language`, `functions_count`.
- **`class`:** Represents an object-oriented class declaration. Attributes: `name`, `bases`, `docstring`, `methods`.
- **`function`:** Represents top-level functions or class methods. Attributes: `signature`, `docstring`, `start_line`, `end_line`.
- **`endpoint`:** FastAPI or Express route handlers. Attributes: `http_method`, `route_path`.

#### Edges
Edges represent directed relationships:
- **`CALLS`:** `Function_A -> Function_B` (Function A invokes Function B).
- **`DEFINES`:** `File_X -> Class_Y` or `Class_Y -> Method_Z` (Containment hierarchy).
- **`IMPORTS`:** `File_X -> File_Y` (Dependency coupling).

### 4.2 Graph Algorithms & Traversal

1. **BFS Neighborhood Expansion (`GraphContextExpander`):**
   Given an entity identified through vector search, performs a Breadth-First Search up to depth $d=2$ along `CALLS` and `DEFINES` edges to pull in callers and callees into the LLM context.
2. **Dead Code Detection via In-Degree Centrality (`app/dead_code/analyzer.py`):**
   Finds functions and classes with $\text{in-degree} = 0$ (no other function in the repository calls them) that are not entry points or tests.
3. **Cycle Detection (`networkx.simple_cycles`):**
   Identifies circular imports and recursive call chains across services.

---

## 5. Graph-Augmented Hybrid Retrieval (Vector + Graph)

### 5.1 Why Pure Vector Search Fails in Codebases

Standard vector search finds textually similar code, but:
- **Fails on execution flows:** If `handle_login()` calls `verify_jwt()`, searching for "how does login authentication work?" might retrieve `handle_login()`, but miss `verify_jwt()` because the word "login" never appears in `verify_jwt()`.
- **Lacks architectural context:** It cannot determine which file imported a utility or which class inherited an interface.

**Our Solution:** **Hybrid Retrieval** combines dense semantic search with graph neighborhood expansion.

---

### 5.2 Two-Phase Retrieval Lifecycle (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / Web UI
    participant Route as FastAPI /agent/chat
    participant Safety as SafetyManager
    participant LangGraph as Router / Chat Agent
    participant Qdrant as Qdrant Vector DB
    participant Graph as NetworkX Graph Engine
    participant Groq as Groq LPU (Llama-3.3)

    Dev->>Route: POST /agent/chat {"question": "How is authentication handled?"}
    Route->>Safety: validate_input(question)
    Safety-->>Route: Passed (Sanitized Query)
    
    Route->>LangGraph: graph.invoke(state)
    Note over LangGraph: Phase 1: Dense Semantic Search
    LangGraph->>Qdrant: search(query_vector, top_k=5, filter=repository)
    Qdrant-->>LangGraph: Top-5 Semantic Entities (Payloads)

    Note over LangGraph: Phase 2: Graph Context Expansion
    loop For each retrieved entity
        LangGraph->>Graph: expand(graph_node_id, depth=2)
        Graph-->>LangGraph: Callers, Callees & Dependency Nodes
    end

    Note over LangGraph: Phase 3: Prompt Construction
    LangGraph->>Groq: Generate Answer (Prompt + Graph + Semantic Snippets)
    Groq-->>LangGraph: Raw Generated Markdown Response

    Note over LangGraph: Phase 4: Output Guardrail Validation
    LangGraph->>Safety: validate_output(raw_answer)
    Safety-->>Route: Scrubbed Secrets & Validated Citations
    Route-->>Dev: Final Grounded Response with File References
```

---

### 5.3 Context Expansion Algorithm

```python
# Conceptual Hybrid Expansion
class GraphContextExpander:
    def expand(self, node_id: str, depth: int = 2) -> list[dict]:
        if node_id not in self.graph:
            return []
        visited = set()
        queue = [(node_id, 0)]
        context = []
        while queue:
            curr, level = queue.pop(0)
            if curr in visited:
                continue
            visited.add(curr)
            context.append({"node": curr, "data": self.graph.nodes[curr]})
            if level < depth:
                for succ in self.graph.successors(curr):  # Callees
                    queue.append((succ, level + 1))
        return context
```

---

## 6. LangGraph Multi-Agent Orchestration Subsystem

The backend utilizes **LangGraph** to implement a deterministic state machine with dynamic intent routing.

### 6.1 Agent State Definition (`AgentState`)

All agents operate over a shared, immutable state dictionary (`app/agents/state.py`):

```python
class AgentState(TypedDict):
    repository_name: str
    question: str
    route: str
    answer: Union[str, Generator]
    history: List[Dict[str, str]]
    repositories: List[str]          # For cross-repo comparisons
    old_repository: str              # For evolution tracking
    new_repository: str              # For evolution tracking
    pending_patch: Optional[Dict]    # For HITL PR generation
    approval_granted: Optional[bool] # Resumed by /agent/approve
```

---

### 6.2 Intelligent Router & Decision Matrix

The router (`app/agents/router.py`) evaluates the user prompt and classifies it into one of 12 distinct routes:

| Intent / Keyword Pattern | Routed Agent Node | Description |
| :--- | :--- | :--- |
| "how does", "what is", general questions | `chat` | Hybrid RAG codebase Q&A |
| "architecture", "overview", "components" | `architecture` | Structural & layer breakdown |
| "trace", "call flow", "what calls X" | `flow` | Call path traversal across graph |
| "docstring", "document", "generate docs" | `documentation` | Automated AST docstring authoring |
| "vulnerability", "security", "audit", "cve" | `security` | Security scan & vulnerability analysis |
| "fix security", "patch vulnerability" | `security_fix` | Generates verified remediation diffs |
| "dead code", "unused functions", "cleanup" | `dead_code` | Graph in-degree zero code audit |
| "class diagram", "sequence diagram", "uml" | `uml` | Generates Mermaid UML models |
| "system diagram", "service diagram" | `architecture_diagram` | Generates Mermaid architectural flows |
| "compare", "versus", "diff repos" | `comparison` | Multi-repository architectural diff |
| "evolution", "changes", "commit drift" | `evolution` | Version-to-version drift tracker |
| "create pr", "open pull request" | `await_approval` | Triggers HITL interrupt gate |

---

### 6.3 Complete Multi-Agent State Machine (Flowchart)

```mermaid
stateDiagram-v2
    [*] --> START
    START --> router: User Query / Request

    state router <<choice>>
    router --> chat: route == "chat"
    router --> architecture: route == "architecture"
    router --> flow: route == "flow"
    router --> documentation: route == "documentation"
    router --> security: route == "security"
    router --> security_fix: route == "security_fix"
    router --> dead_code: route == "dead_code"
    router --> uml: route == "uml"
    router --> architecture_diagram: route == "architecture_diagram"
    router --> comparison: route == "comparison"
    router --> evolution: route == "evolution"
    router --> await_approval: route == "await_approval"

    chat --> END
    architecture --> END
    flow --> END
    documentation --> END
    security --> END
    security_fix --> END
    dead_code --> END
    uml --> END
    architecture_diagram --> END
    comparison --> END
    evolution --> END

    await_approval --> INTERRUPT: langgraph.types.interrupt()
    INTERRUPT --> RESUME: POST /agent/approve {approved: true/false}
    RESUME --> pr: approved == true
    RESUME --> END: approved == false
    pr --> END

    END --> [*]
```

---

### 6.4 The 12 Specialized Agent Nodes

1. **`chat_node`:** Executes hybrid search, queries Groq/Gemini with grounded context, formats file/line citations.
2. **`architecture_node`:** Synthesizes file structure, module layers, external libraries, and high-level architectural patterns.
3. **`flow_node`:** Takes a target symbol, executes BFS across `CALLS` edges in the graph, and generates both text traces and Mermaid sequence diagrams.
4. **`documentation_node`:** Parses function ASTs, checks for missing docstrings, and generates Google/NumPy style docstrings matching parameter type hints.
5. **`security_node`:** Combines high-precision regex scanners with LLM contextual audits to detect SQL injection, insecure deserialization, SSRF, and command injection while discarding documentation false positives.
6. **`security_fix_node`:** Takes confirmed vulnerabilities and generates surgical unified diffs (`+` / `-`) for remediation.
7. **`dead_code_node`:** Evaluates graph centrality, identifies unreferenced functions, and produces surgical removal suggestions.
8. **`uml_node`:** Generates verified Mermaid.js `classDiagram` and `sequenceDiagram` syntax from the repository's AST classes and methods.
9. **`architecture_diagram_node`:** Synthesizes `flowchart TD` diagrams modeling ingress gateways, service layers, and storage tiers.
10. **`comparison_node`:** Ingests two or more repositories and produces side-by-side matrices comparing framework choices, graph density, and architecture.
11. **`evolution_node`:** Compares two versions or commit tags of a repository, reporting API surface changes, added/deleted symbols, and complexity drift.
12. **`await_approval_node` & `pr_node`:** Enforces Human-in-the-Loop review before any PR or branch modification occurs.

---

## 7. Human-in-the-Loop (HITL) PR Creation Gate

### 7.1 LangGraph Interrupt & Resume Lifecycle

In autonomous code assistants, executing repository writes or PR creation without human review is dangerous. The CodeBase backend uses LangGraph's native `interrupt()` feature:

1. When the agent reaches `await_approval_node`, it packages the proposed patch, branch name, and commit message into an approval payload.
2. It invokes `interrupt(approval_request)`. This pauses the LangGraph execution thread and persists state into `MemorySaver`.
3. The API route (`/agent/chat`) intercepts the `__interrupt__` signal and returns HTTP 200 with `{ "approval_needed": True, "approval_request": payload }`.
4. The client UI renders a unified diff review dialog with "Approve PR" and "Reject" buttons.
5. When the user clicks "Approve", the client sends `POST /agent/approve` with `{ "request_id": thread_id, "approved": true }`.
6. The backend resumes execution using `graph.invoke(Command(resume={"approved": True}), config=config)`, which transitions to `pr_node` to create the git branch and commit the patch.

---

### 7.2 HITL Workflow (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer (UI)
    participant API as FastAPI Gateway (/agent)
    participant Graph as LangGraph Engine
    participant Checkpoint as MemorySaver Checkpointer
    participant Git as Git / GitHub Service

    Dev->>API: POST /agent/chat {"question": "Fix SQL injection in auth.py and create PR"}
    API->>Graph: invoke(state, thread_id="t-101")
    Graph->>Graph: router -> security_fix -> await_approval
    Note over Graph: Agent generates diff & calls interrupt()
    Graph->>Checkpoint: Persist State & Halt Execution
    Graph-->>API: Yield __interrupt__ (Patch Payload)
    API-->>Dev: HTTP 200 {approval_needed: true, diff: "--- a/auth.py\n+++ b/auth.py..."}

    Note over Dev: Developer reviews colorized diff in UI dialog
    Dev->>API: POST /agent/approve {request_id: "t-101", approved: true}
    API->>Graph: invoke(Command(resume={approved: true}), thread_id="t-101")
    Graph->>Checkpoint: Restore Execution Context
    Graph->>Graph: Transition to pr_node
    Graph->>Git: git checkout -b fix/sql-injection && git commit && git push
    Git-->>Graph: PR #42 Created (https://github.com/.../pull/42)
    Graph-->>API: PR Result
    API-->>Dev: HTTP 200 {pr_url: "https://github.com/.../pull/42", status: "success"}
```

---

## 8. Dual-Layer Enterprise Guardrails

Security in CodeBase RAG Assistant is enforced at two distinct perimeter boundaries via `app/guardrails/safety_manager.py`:

```
User Query ──► [Layer 1: Input Guardrail] ──► Agent Engine ──► [Layer 2: Output Guardrail] ──► Verified Response
```

### 8.1 Input Sanitization & Prompt Injection Defense

The `PromptInjectionGuardrail` protects the backend from adversarial jailbreaks, system prompt overrides, and data exfiltration attempts:

- **Detection Patterns:**
  - System prompt overrides: `"ignore previous instructions"`, `"disregard all system prompts"`
  - Privilege escalation: `"you are now in maintenance mode"`, `"developer mode enabled"`
  - Data exfiltration: `"dump your entire vector database"`, `"reveal secret keys"`
  - Delimiter attacks: Malicious markdown or XML tag injections (`</system>`, `[INST]`)
- **Action:** Intercepts malicious queries *before* LLM execution, records a Prometheus metric (`metrics.record_guardrail_violation("prompt_injection")`), and returns a safety intervention warning.

### 8.2 Output Secret Scrubbing & Citation Grounding

The output pipeline runs two validations on model generations before returning them to the client:

1. **Data Leakage & Secret Scrubbing (`DataLeakageGuardrail`):**
   - Scans text using high-entropy regex patterns for:
     - AWS Access Keys (`AKIA[0-9A-Z]{16}`)
     - GitHub Personal Access Tokens (`ghp_[0-9a-zA-Z]{36}`)
     - Private RSA/SSH Keys (`-----BEGIN OPENSSH PRIVATE KEY-----`)
     - Generic API Keys, JWT Tokens, and Bearer Credentials
   - Redacts detected credentials with `[REDACTED_SECRET]` tags to prevent accidental leakage.
2. **Citation Grounding Validation (`CitationValidatorGuardrail`):**
   - Extracts all file path citations made by the model (e.g., `app/services/indexer.py#L45-L60`).
   - Verifies whether the referenced file and symbols actually exist in the indexed `RepositoryIndex`.
   - Flags or strips hallucinated citations, ensuring 100% citation grounding accuracy.

---

### 8.3 Guardrails Execution Flowchart

```mermaid
flowchart TD
    QUERY[Developer Query] --> IN_VAL{Input Guardrail: Prompt Injection?}
    IN_VAL -- Failed --> BLOCK_IN[Block Request + Increment Prometheus Metric + Return Policy Warning]
    IN_VAL -- Passed --> AGENT[LangGraph Multi-Agent Execution & LLM Generation]

    AGENT --> OUT_SCRUB[Output Guardrail 1: Secret & Credential Scrubber]
    OUT_SCRUB --> CITE_VAL{Output Guardrail 2: Citation Validator}
    CITE_VAL -- Hallucinated Citations Found --> ANNOTATE[Strip / Annotate Citations + Log Telemetry]
    CITE_VAL -- All Citations Verified --> SAFE[Emit Verified Output to Client]
    ANNOTATE --> SAFE
```

---

## 9. Real-Time SSE Streaming & Concurrency Architecture

The backend supports real-time streaming for two resource-intensive operations:
1. **Repository Ingestion Progress (`/repository/index-stream`):** Emits stage-by-stage events (`clone`, `scan`, `parse`, `graph`, `embed`, `store`, `done`).
2. **Agent Chat Token Streaming (`/agent/chat-stream`):** Emits token-by-token LLM completions via standard Server-Sent Events (SSE).

### Architecture Pattern

```python
# Streaming Pattern via Threaded Queue & Generator
q: queue.Queue = queue.Queue()

def run_task():
    try:
        indexer.index_repository(on_progress=q.put)
    finally:
        q.put(None)  # Sentinel indicates completion

threading.Thread(target=run_task, daemon=True).start()

def sse_generator():
    while True:
        event = q.get()
        if event is None:
            break
        yield f"data: {json.dumps(event)}\n\n"

return StreamingResponse(sse_generator(), media_type="text/event-stream")
```

**Benefits:**
- The client UI updates its 6-stage stepper smoothly in real-time.
- Decouples long-running ingestion from HTTP request timeouts.
- Uses W3C-standard SSE formatting (`data: ...\n\n`) compatible with browser `EventSource` and fetch readers.

---

## 10. Observability, Prometheus Metrics & Audit Telemetry

The backend integrates enterprise observability via `app/observability/metrics.py` and exposes a Prometheus-compatible scrape endpoint at `/metrics`.

### Telemetry Signals Tracked

| Metric Name | Type | Labels | Description |
| :--- | :--- | :--- | :--- |
| `http_requests_total` | Counter | `endpoint`, `status` | Total HTTP requests handled |
| `http_request_duration_seconds` | Histogram | `operation` | Execution latency breakdown (e.g. `chat_workflow`, `ingestion`) |
| `guardrail_violations_total` | Counter | `violation_type` | Counts for `prompt_injection`, `secret_leakage`, `citation_fail` |
| `token_usage_total` | Counter | `model`, `type` | Total prompt and completion tokens consumed |
| `active_repositories_count` | Gauge | `—` | Number of currently indexed codebases in memory |

### Correlation ID Middleware

Every incoming request is tagged with a unique `X-Request-ID` (UUIDv4) header:
- Automatically propagated through all log lines.
- Attached to outgoing HTTP responses for end-to-end distributed tracing.

---

## 11. Module Directory & File Responsibility Directory

```
app/
├── agents/                       # LangGraph multi-agent orchestration
│   ├── graph_builder.py          # StateGraph definition and compiled graph
│   ├── state.py                  # AgentState schema
│   ├── router.py                 # Intent classifier node
│   ├── chat_agent.py             # Hybrid RAG Q&A agent
│   ├── architecture_agent.py     # Structural analysis agent
│   ├── flow_agent.py             # Call flow tracer agent
│   ├── security_agent.py         # Static code vulnerability auditor
│   ├── security_fix_agent.py     # Unified diff patch author
│   ├── dead_code_agent.py        # Graph centrality unused code auditor
│   ├── uml_agent.py              # Mermaid UML generator
│   ├── comparison_agent.py       # Cross-repo comparator
│   ├── evolution_agent.py        # Version-to-version drift tracker
│   ├── await_approval_agent.py   # HITL interrupt gate
│   └── pr_agent.py               # Git branch & PR author
├── analysis/                     # Specialized static analysis services
│   ├── architecture_analyzer.py  # Layered architecture detector
│   └── repository_summarizer.py  # Repository-level summary generator
├── api/                          # FastAPI routing and request schemas
│   ├── routes/
│   │   ├── agent.py              # /agent/chat, /agent/chat-stream, /agent/approve
│   │   └── repository.py         # /repository/parse, /repository/index-stream, etc.
│   └── schemas/                  # Pydantic request & response models
├── core/                         # Configuration and environment settings
│   └── config.py                 # Paths, API keys, model parameters
├── dead_code/                    # Dead code detection logic
│   └── analyzer.py               # In-degree 0 graph calculation
├── embeddings/                   # Dense vector generation
│   └── embedding_service.py      # Cohere API client with batching and retry logic
├── graph/                        # Graph structures and models
├── guardrails/                   # Security and safety validation
│   ├── safety_manager.py         # Master guardrail coordinator
│   ├── prompt_injection.py       # Input prompt injection filter
│   ├── data_leakage.py           # Secret & API key scrubber
│   └── citation_validator.py     # Grounded file citation validator
├── indexing/                     # Ingestion subsystem
│   ├── repository_loader.py      # Git shallow cloning & URL normalization
│   ├── scanner.py                # File filtering and size cap validation
│   ├── index_builder.py          # NetworkX graph and index assembly
│   └── models/
│       └── entity_extractor.py   # Function/class CodeEntity extraction
├── observability/                # Prometheus metrics and tracing
│   └── metrics.py                # Prometheus metric registry and latency timers
├── parsers/                      # Tree-Sitter AST code parsing
│   ├── parser_registry.py        # File extension parser router
│   ├── python/                   # Python AST extractor
│   └── generic_extractor.py      # JS, TS, JSX, TSX AST extractors
├── retrieval/                    # Search and context assembly
│   ├── hybrid_retriever.py       # Two-phase vector + graph retriever
│   ├── semantic_search.py        # Qdrant client wrapper
│   └── context_expander.py       # Graph BFS neighborhood traversal
├── security/                     # Security scanner rules and patterns
│   ├── scanner.py                # AST and regex vulnerability scanner
│   └── patterns.py               # High-precision security rules & safe patterns
├── storage/                      # Persistence layers
│   ├── repository_registry.py    # Cached repository index store
│   └── vector_store.py           # Qdrant vector database collection manager
└── streaming/                    # Event queues for real-time SSE
    └── stream_manager.py         # Thread-safe event queue
```

---

## 12. Backend Optimization & Improvement Roadmap

While the backend is robust, scalable, and highly performant, the following key engineering initiatives represent high-impact next steps for future expansion:

1. **Persistent Checkpointer for LangGraph:**
   - *Current:* Uses in-memory `MemorySaver` (interrupted HITL approvals reset upon server restart).
   - *Improvement:* Migrate to `SqliteSaver` or `PostgresSaver` to persist approval requests across worker restarts.
2. **Hybrid Reciprocal Rank Fusion (RRF):**
   - *Current:* Uses dense vector search (Cohere) followed by graph expansion.
   - *Improvement:* Introduce sparse BM25 keyword search alongside dense vectors and merge candidates using Reciprocal Rank Fusion ($RRF = \sum \frac{1}{k + r_i}$) before graph expansion.
3. **Async Background Workers (Celery / Redis / RQ):**
   - *Current:* Ingestion streams run in daemon Python threads inside the FastAPI process.
   - *Improvement:* Offload heavy indexing jobs to dedicated Celery worker pools with Redis queues to support dozens of concurrent repo indexing jobs.
4. **Multi-Language Tree-Sitter Expansion:**
   - *Current:* Python, JavaScript, TypeScript, JSX, TSX.
   - *Improvement:* Add Tree-Sitter grammars for Go, Rust, Java, and C# to support polyglot enterprise codebases.
5. **Incremental Git Diffs & Dynamic Graph Patching:**
   - *Current:* Re-indexes the full repository when force re-indexing.
   - *Improvement:* Ingest `git diff` patches upon webhook trigger (`push` events), surgically updating only modified nodes and edges in the NetworkX graph and Qdrant collection.

---
*Documentation compiled and maintained for the CodeBase Engineering Team.*
