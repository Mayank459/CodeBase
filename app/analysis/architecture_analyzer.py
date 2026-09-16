"""Architecture analyzer module with comprehensive repository telemetry."""
import json
import re
from pathlib import Path
from app.core.config import BASE_DIR


FRAMEWORK_REGISTRY = {
    # Frontend & UI
    "react": ("React", "Frontend & UI", "Declarative component-based UI library & Virtual DOM rendering", "#06b6d4"),
    "react-dom": ("React DOM", "Frontend & UI", "DOM renderer for React web applications", "#06b6d4"),
    "vue": ("Vue.js", "Frontend & UI", "Progressive reactive frontend framework", "#42b883"),
    "next": ("Next.js", "Full-Stack Framework", "React framework with SSR, ISR, and API routing", "#ffffff"),
    "vite": ("Vite", "Build Tool & Bundler", "Lightning-fast HMR and Rollup-based asset bundler", "#bd34fe"),
    "tailwindcss": ("Tailwind CSS", "Styling & Design", "Utility-first CSS styling engine", "#38bdf8"),
    "daisyui": ("DaisyUI", "UI Components", "Semantic Tailwind CSS component classes", "#1ad1a5"),
    "lucide-react": ("Lucide Icons", "UI Icons", "Modern lightweight SVG icon package", "#f43f5e"),
    "@monaco-editor/react": ("Monaco Editor", "Code Editing", "In-browser VS Code syntax & code editor runtime", "#007acc"),
    "@tanstack/react-query": ("TanStack Query", "State & Data Fetching", "Asynchronous server-state management & caching", "#ff4154"),
    "react-router": ("React Router", "Client Routing", "Declarative client-side route navigation & nested outlets", "#f44250"),
    "react-router-dom": ("React Router DOM", "Client Routing", "DOM bindings for React Router navigation", "#f44250"),
    "axios": ("Axios", "HTTP Client", "Promise-based HTTP request transport client", "#5a29e4"),
    "redux": ("Redux", "Global State", "Predictable global state container", "#764abc"),
    "zustand": ("Zustand", "Global State", "Lightweight, unopinionated React state management", "#443e38"),
    
    # Backend & API
    "express": ("Express.js", "Backend & API", "Minimalist Node.js web server & middleware framework", "#ffffff"),
    "fastapi": ("FastAPI", "Backend & API", "High-performance async Python web API framework with OpenAPI", "#009688"),
    "flask": ("Flask", "Backend & API", "WSGI micro-framework for Python web services", "#ffffff"),
    "django": ("Django", "Full-Stack Backend", "Batteries-included Python web framework with ORM", "#092e20"),
    "cors": ("CORS", "API Security", "Cross-Origin Resource Sharing middleware", "#94a3b8"),
    "dotenv": ("Dotenv", "Configuration", "Loads environment variables from .env configurations", "#ecd53f"),

    # Database & Storage
    "mongoose": ("Mongoose", "Database & ORM", "Schema-based MongoDB object modeling & validation", "#880000"),
    "prisma": ("Prisma", "Database & ORM", "Type-safe next-generation ORM for Node.js & TypeScript", "#2d3748"),
    "sqlalchemy": ("SQLAlchemy", "Database & ORM", "Python SQL toolkit and Object Relational Mapper", "#d71f00"),
    "qdrant-client": ("Qdrant Client", "Vector Database", "Vector similarity search engine client", "#dc2626"),
    "qdrant_client": ("Qdrant Client", "Vector Database", "Vector similarity search engine client", "#dc2626"),
    "chromadb": ("ChromaDB", "Vector Database", "AI-native open-source embedding database", "#f59e0b"),

    # Auth & Identity
    "@clerk/express": ("Clerk Express", "Auth & Identity", "Backend user authentication & session management middleware", "#6c47ff"),
    "@clerk/clerk-react": ("Clerk React", "Auth & Identity", "Client authentication UI, user button & session hooks", "#6c47ff"),
    "jsonwebtoken": ("JWT (JSON Web Token)", "Auth & Security", "Stateless authentication token verification", "#d63aff"),
    "bcrypt": ("Bcrypt", "Security & Hashing", "Cryptographic password hashing algorithm", "#10b981"),

    # Real-Time & Video
    "@stream-io/video-react-sdk": ("Stream Video SDK", "Real-Time & Video", "Live audio/video calling infrastructure and UI components", "#005fff"),
    "@stream-io/node-sdk": ("Stream Node SDK", "Real-Time & Video", "Server-side video room generation and permission token signing", "#005fff"),
    "stream-chat": ("Stream Chat", "Real-Time Messaging", "Scalable messaging & chat engine client", "#005fff"),
    "stream-chat-react": ("Stream Chat React", "Real-Time Messaging", "Prebuilt React chat messaging components", "#005fff"),
    "socket.io": ("Socket.io", "Real-Time Messaging", "Bidirectional event-based WebSocket communication", "#010101"),

    # AI & Multi-Agent
    "@google/generative-ai": ("Google Gemini AI", "Generative AI", "Gemini LLM SDK for multimodal generation & reasoning", "#4285f4"),
    "langgraph": ("LangGraph", "Multi-Agent Orchestration", "Cyclic graph-based stateful multi-agent workflows", "#ec4899"),
    "langchain": ("LangChain", "LLM Framework", "Composability tooling for LLM chains and retrievers", "#10b981"),
    "openai": ("OpenAI SDK", "Generative AI", "GPT model completion, embeddings, and tool calling", "#10a37f"),
    "cohere": ("Cohere SDK", "Vector & Rerank AI", "High-accuracy text embeddings and semantic reranking", "#39594d"),
    "tree_sitter": ("Tree-sitter", "Code Analysis & AST", "Incremental parsing library for concrete syntax trees", "#3b82f6"),
    "networkx": ("NetworkX", "Graph Analysis", "Complex network graph creation, manipulation, and centrality algorithms", "#22c55e"),

    # Workflow & Queue
    "inngest": ("Inngest", "Serverless Queues", "Durable workflow execution, background jobs, and event-driven step functions", "#2e70ff"),
    "celery": ("Celery", "Distributed Task Queue", "Asynchronous task execution and distributed scheduling", "#37814a"),
}


class ArchitectureAnalyzer:

    def __init__(self, repository_index):
        self.repository_index = repository_index
        self.graph = repository_index.graph

    def get_top_nodes(self, limit=20):
        degrees = []
        for node in self.graph.nodes():
            degree = self.graph.degree(node)
            degrees.append((node, degree))

        degrees.sort(key=lambda x: x[1], reverse=True)
        return degrees[:limit]

    def discover_modules(self):
        modules = {}
        for parsed_file in self.repository_index.parsed_files:
            modules[parsed_file.file_path] = {
                "classes": len(parsed_file.classes),
                "functions": len(parsed_file.functions),
                "variables": len(parsed_file.variables)
            }
        return modules

    def detect_languages(self):
        ext_map = {
            "py": ("Python", "#3b82f6"),
            "js": ("JavaScript", "#eab308"),
            "jsx": ("React (JSX)", "#06b6d4"),
            "ts": ("TypeScript", "#3178c6"),
            "tsx": ("React (TSX)", "#06b6d4"),
            "html": ("HTML", "#f97316"),
            "css": ("CSS", "#a855f7"),
            "scss": ("SCSS", "#ec4899"),
            "json": ("JSON", "#64748b"),
            "md": ("Markdown", "#475569"),
            "yml": ("YAML", "#e11d48"),
            "yaml": ("YAML", "#e11d48"),
            "sh": ("Shell", "#22c55e"),
            "bash": ("Shell", "#22c55e"),
            "sql": ("SQL", "#f59e0b"),
            "go": ("Go", "#00add8"),
            "java": ("Java", "#ea2d2e"),
        }

        lang_counts = {}
        total_files = len(self.repository_index.parsed_files)

        for p in self.repository_index.parsed_files:
            ext = Path(p.file_path).suffix.lstrip(".").lower()
            if not ext and "dockerfile" in p.file_path.lower():
                lang_name, color = ("Dockerfile", "#38bdf8")
            else:
                lang_name, color = ext_map.get(ext, ("Other", "#94a3b8"))

            if lang_name not in lang_counts:
                lang_counts[lang_name] = {"name": lang_name, "files": 0, "color": color}
            lang_counts[lang_name]["files"] += 1

        languages = sorted(lang_counts.values(), key=lambda x: x["files"], reverse=True)
        for l in languages:
            l["percentage"] = round((l["files"] / max(total_files, 1)) * 100, 1)

        primary_lang = languages[0]["name"] if languages else "Unknown"
        return {
            "primary_language": primary_lang,
            "languages": languages
        }

    def detect_frameworks(self):
        detected = {}

        # 1. Inspect package.json files
        for p in self.repository_index.parsed_files:
            if "package.json" in p.file_path.lower():
                try:
                    data = json.loads(p.source_code) if p.source_code else {}
                    if not data and (BASE_DIR / p.file_path).exists():
                        data = json.loads((BASE_DIR / p.file_path).read_text(encoding="utf-8", errors="ignore"))
                    
                    all_deps = list(data.get("dependencies", {}).keys()) + list(data.get("devDependencies", {}).keys())
                    for dep in all_deps:
                        dep_lower = dep.lower()
                        if dep_lower in FRAMEWORK_REGISTRY and dep_lower not in detected:
                            name, category, role, color = FRAMEWORK_REGISTRY[dep_lower]
                            detected[dep_lower] = {
                                "name": name,
                                "category": category,
                                "role": role,
                                "badge_color": color
                            }
                except Exception:
                    pass

        # 2. Inspect Python imports and source references
        all_imports = set()
        for p in self.repository_index.parsed_files:
            for imp in p.imports:
                mod = getattr(imp, "module", "") or getattr(imp, "name", "")
                if not mod or not isinstance(mod, str):
                    continue
                clean_mod = mod.lstrip(".").strip()
                if not clean_mod:
                    continue
                top_parts = clean_mod.split(".")[0].lower().replace(" as ", " ").split()
                if top_parts:
                    all_imports.add(top_parts[0])

        for imp_name, (name, category, role, color) in FRAMEWORK_REGISTRY.items():
            if imp_name.lower() in all_imports and imp_name.lower() not in detected:
                detected[imp_name.lower()] = {
                    "name": name,
                    "category": category,
                    "role": role,
                    "badge_color": color
                }

        # 3. Known project files heuristics
        file_paths = [p.file_path.lower() for p in self.repository_index.parsed_files]
        if any("vite.config" in fp for fp in file_paths) and "vite" not in detected:
            detected["vite"] = {
                "name": "Vite",
                "category": "Build Tool & Bundler",
                "role": "Lightning-fast HMR and Rollup-based asset bundler",
                "badge_color": "#bd34fe"
            }
        if any("tailwind" in fp for fp in file_paths) and "tailwindcss" not in detected:
            detected["tailwindcss"] = {
                "name": "Tailwind CSS",
                "category": "Styling & Design",
                "role": "Utility-first CSS styling engine",
                "badge_color": "#38bdf8"
            }
        if any("dockerfile" in fp for fp in file_paths):
            detected["docker"] = {
                "name": "Docker",
                "category": "DevOps & Deployment",
                "role": "Containerized runtime environment specification",
                "badge_color": "#2496ed"
            }

        return list(detected.values())

    def classify_layers(self):
        layers_def = [
            (
                "Presentation & UI Layer",
                "Frontend",
                ["components", "pages", "views", "ui", "styles", "layouts", ".jsx", ".tsx", ".html", ".css", ".scss"],
                ["backend", "server", "controllers"],
                "User-facing components, views, layouts, and style definitions.",
                "#06b6d4"
            ),
            (
                "API Gateway & Routing Layer",
                "Routing",
                ["routes", "api", "controllers", "endpoints", "router"],
                [],
                "HTTP request routing, URL dispatching, and controller endpoints.",
                "#6366f1"
            ),
            (
                "Business Logic & Services",
                "Core Logic",
                ["services", "agents", "core", "domain", "workflows", "utils", "helpers", "analysis", "evals"],
                [],
                "Domain workflows, processing algorithms, and business logic execution.",
                "#10b981"
            ),
            (
                "Data & Persistence Layer",
                "Persistence",
                ["models", "schemas", "db", "database", "storage", "indexing", "repositories", "entities"],
                [],
                "Data models, database connections, schemas, and persistence operations.",
                "#f59e0b"
            ),
            (
                "State & Client Store",
                "State",
                ["context", "hooks", "store", "redux", "reducers", "zustand"],
                [],
                "Client-side state management, custom React hooks, and shared contexts.",
                "#ec4899"
            ),
            (
                "Build, DevOps & Config",
                "Infrastructure",
                ["docker", "vite.config", "package.json", "requirements", "tsconfig", "eslint", "vercel.json", "webpack"],
                [],
                "Project configuration, dependency manifests, and build tooling.",
                "#8b5cf6"
            )
        ]

        total_files = len(self.repository_index.parsed_files)
        matched_layers = []

        for l_name, l_cat, positive_kw, negative_kw, desc, color in layers_def:
            matching_files = []
            for p in self.repository_index.parsed_files:
                path_lower = p.file_path.lower().replace("\\", "/")
                # Check negative exclusions
                if negative_kw and any(neg in path_lower for neg in negative_kw):
                    continue
                if any(pos in path_lower for pos in positive_kw):
                    matching_files.append(p.file_path)

            if matching_files:
                matched_layers.append({
                    "name": l_name,
                    "category": l_cat,
                    "file_count": len(matching_files),
                    "percentage": round((len(matching_files) / max(total_files, 1)) * 100, 1),
                    "description": desc,
                    "sample_files": matching_files[:4],
                    "badge_color": color
                })

        return matched_layers

    def detect_entry_points(self):
        entry_points = []
        file_paths = {p.file_path.replace("\\", "/"): p for p in self.repository_index.parsed_files}

        # Server entries
        server_candidates = [
            ("backend/server.js", "Server Entry Point", "Bootstraps backend Express/Node HTTP server, mounts middleware, and binds to network port."),
            ("backend/src/index.js", "Server Entry Point", "Initializes backend API server and registers route middleware."),
            ("server.js", "Server Entry Point", "Root application HTTP server entry point."),
            ("main.py", "Application Entry Point", "Central entry point launching FastAPI server or CLI orchestration."),
            ("app/main.py", "API Application Entry", "FastAPI application factory, middleware configuration, and router aggregation."),
            ("backend/main.py", "Backend Service Entry", "FastAPI/Flask service startup script."),
            ("app.py", "Application Entry Point", "Core application bootstrap script.")
        ]

        # Client entries
        client_candidates = [
            ("frontend/src/main.jsx", "Client Root Entry", "Mounts the root React DOM tree, registers global providers, and initiates client rendering."),
            ("frontend/src/index.jsx", "Client Root Entry", "Mounts client React application tree and global stylesheet."),
            ("src/main.jsx", "Client Root Entry", "Mounts React application to the root DOM container with strict mode."),
            ("src/index.tsx", "Client Root Entry", "TypeScript React DOM initialization with root theme and error boundaries."),
            ("frontend/index.html", "HTML Shell Host", "Single-page HTML document hosting client bundle scripts and font assets."),
            ("index.html", "HTML Shell Host", "Root HTML template containing viewport meta tags and script entry tags.")
        ]

        # Root UI components
        root_ui_candidates = [
            ("frontend/src/App.jsx", "Root UI Controller", "Top-level application component coordinating layout, global navigation, and view routing."),
            ("src/App.jsx", "Root UI Controller", "Primary component coordinating client state, router outlets, and navbar navigation."),
            ("src/App.tsx", "Root UI Controller", "Primary TypeScript component orchestrating app shell layouts.")
        ]

        # Job / Orchestration entries
        job_candidates = [
            ("backend/src/lib/inngest.js", "Background Job Worker", "Inngest durable functions client configuring event triggers and serverless queues."),
            ("inngest.js", "Background Job Worker", "Durable workflow definitions and serverless job orchestration.")
        ]

        seen_paths = set()
        for candidates in [server_candidates, client_candidates, root_ui_candidates, job_candidates]:
            for rel_path, entry_type, desc in candidates:
                for actual_path in file_paths:
                    if actual_path.lower() == rel_path.lower() or actual_path.lower().endswith("/" + rel_path.lower()):
                        if actual_path not in seen_paths:
                            seen_paths.add(actual_path)
                            entry_points.append({
                                "path": actual_path,
                                "type": entry_type,
                                "description": desc
                            })

        return entry_points

    def get_centrality_hubs(self, limit=6):
        hubs = []
        if self.graph.number_of_nodes() == 0:
            return hubs

        node_scores = []
        for node in self.graph.nodes():
            in_deg = self.graph.in_degree(node) if hasattr(self.graph, "in_degree") else 0
            out_deg = self.graph.out_degree(node) if hasattr(self.graph, "out_degree") else 0
            total = in_deg + out_deg
            node_scores.append((node, in_deg, out_deg, total))

        node_scores.sort(key=lambda x: x[3], reverse=True)

        for node, in_deg, out_deg, total in node_scores[:limit]:
            if in_deg >= out_deg:
                role = f"High Afferent Coupling — Depended on by {in_deg} components"
            else:
                role = f"High Efferent Coupling — Coordinates {out_deg} downstream dependencies"

            hubs.append({
                "node": str(node),
                "in_degree": in_deg,
                "out_degree": out_deg,
                "total_degree": total,
                "role": role
            })

        return hubs

    def detect_pattern(self):
        file_paths = [p.file_path.lower().replace("\\", "/") for p in self.repository_index.parsed_files]

        has_frontend = any("frontend/" in fp or "src/components" in fp for fp in file_paths)
        has_backend = any("backend/" in fp or "server/" in fp or "api/" in fp for fp in file_paths)
        has_agents = any("agent" in fp or "workflow" in fp for fp in file_paths)

        if has_frontend and has_backend:
            return {
                "pattern": "Decoupled Full-Stack Architecture",
                "summary": "Separated client-side single page application (SPA) and backend API service tier communicating over HTTP REST/JSON endpoints, enabling independent deployment and isolated state persistence.",
                "badge": "Full-Stack Distributed"
            }
        elif has_agents:
            return {
                "pattern": "Multi-Agent Cognitive & Graph Architecture",
                "summary": "Graph-orchestrated multi-agent architecture utilizing directed stateful pipelines, AST code graph indexing, and semantic vector retrieval.",
                "badge": "Agentic Graph Pipeline"
            }
        elif has_frontend:
            return {
                "pattern": "Client-Side Single Page Application (SPA)",
                "summary": "Modern component-driven frontend architecture with client-side routing, virtual DOM reactivity, and dynamic component styling.",
                "badge": "Frontend SPA"
            }
        elif has_backend:
            return {
                "pattern": "Layered Modular Service Architecture",
                "summary": "Modular service architecture organizing endpoints into routes, business logic services, and persistence layers.",
                "badge": "Modular Backend"
            }
        else:
            return {
                "pattern": "Modular Component Architecture",
                "summary": "Standard modular software architecture partitioned into self-contained source units and utility modules.",
                "badge": "Modular Library"
            }

    def compute_loc(self):
        total_loc = 0
        for p in self.repository_index.parsed_files:
            if p.source_code:
                total_loc += len(p.source_code.splitlines())
            else:
                local_f = BASE_DIR / p.file_path
                if local_f.exists():
                    try:
                        total_loc += len(local_f.read_text(encoding="utf-8", errors="ignore").splitlines())
                    except Exception:
                        pass
                else:
                    # Estimate LOC based on entities
                    total_loc += max(len(p.classes) * 25 + len(p.functions) * 15 + len(p.variables) * 2, 10)
        return total_loc

    def analyze(self):
        total_files = len(self.repository_index.parsed_files)
        total_loc = self.compute_loc()
        graph_nodes = self.graph.number_of_nodes()
        graph_edges = self.graph.number_of_edges()

        # Modularity index (ratio of nodes to edges, normalized)
        density = round(graph_edges / max(graph_nodes, 1), 2)
        modularity_score = max(min(round(100 - (density * 15)), 96), 65)

        pattern_info = self.detect_pattern()
        languages_info = self.detect_languages()
        frameworks = self.detect_frameworks()
        layers = self.classify_layers()
        entry_points = self.detect_entry_points()
        centrality_hubs = self.get_centrality_hubs()

        overview = {
            "architecture_pattern": pattern_info["pattern"],
            "pattern_badge": pattern_info["badge"],
            "summary": pattern_info["summary"],
            "total_files": total_files,
            "total_loc": total_loc,
            "graph_nodes": graph_nodes,
            "graph_edges": graph_edges,
            "coupling_density": density,
            "modularity_score": modularity_score,
        }

        tech_stack = {
            "primary_language": languages_info["primary_language"],
            "languages": languages_info["languages"],
            "frameworks": frameworks
        }

        return {
            # New rich telemetry
            "overview": overview,
            "tech_stack": tech_stack,
            "layers": layers,
            "entry_points": entry_points,
            "centrality_hubs": centrality_hubs,

            # Preserved backwards-compatible fields
            "top_nodes": self.get_top_nodes(),
            "modules": self.discover_modules(),
            "graph_nodes": graph_nodes,
            "graph_edges": graph_edges
        }