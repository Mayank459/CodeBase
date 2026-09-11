"""Flow agent module."""
from app.analysis.flow_analyzer import FlowAnalyzer
from app.storage.repository_registry import repository_registry
from app.retrieval.semantic_search import SemanticSearcher
from app.chat.llm_provider import LLMProvider


def flow_node(state):
    repository_name = state.get("repository_name")
    question = state.get("question", "")

    repository = repository_registry.get(repository_name)
    if not repository:
        state["answer"] = "Repository not indexed. Please index it first using POST /repository/parse."
        return state

    q_lower = question.lower()
    is_project_overview = any(
        term in q_lower
        for term in [
            "flowchart", "project", "codebase", "architecture", "system",
            "overview", "entire", "pipeline", "diagram", "whole"
        ]
    )

    start_node = ""

    # 1. If not a broad project query, attempt targeted semantic search first
    if not is_project_overview:
        try:
            searcher = SemanticSearcher()
            results = searcher.search(query=question, top_k=5, repository_name=repository_name)
            for r in results:
                if not r.payload:
                    continue
                cand_node = r.payload.get("graph_node_id", "")
                cand_file = r.payload.get("file_path", "").lower()
                cand_type = r.payload.get("entity_type", "").lower()

                # Filter out prompt templates, test fixtures, and raw variable constants
                if any(k in cand_file for k in ["prompt", "template", "test", "venv", ".claude"]):
                    continue
                if cand_type in ["variable", "constant"]:
                    continue

                if hasattr(repository, "graph") and repository.graph and cand_node in repository.graph:
                    if repository.graph.out_degree(cand_node) > 0 or repository.graph.in_degree(cand_node) > 0:
                        start_node = cand_node
                        break
        except Exception:
            start_node = ""

    # 2. If start_node is still not found or it's a project-level flowchart, find the primary system entrypoint
    if not start_node and hasattr(repository, "graph") and repository.graph:
        candidates = []
        for node in repository.graph.nodes:
            node_str = str(node)
            lower = node_str.lower()

            if any(k in lower for k in ["template", "prompt", "test", "venv", ".claude"]):
                continue
            if repository.graph.nodes.get(node, {}).get("type", "") == "variable":
                continue

            out_deg = repository.graph.out_degree(node)
            if out_deg == 0:
                continue

            score = out_deg
            if any(k in lower for k in ["main", "app", "server", "indexer", "route", "api", "run", "controller"]):
                score += 25
            if "CALL::" in node_str:
                score -= 100

            candidates.append((node, score))

        if candidates:
            candidates.sort(key=lambda x: x[1], reverse=True)
            start_node = str(candidates[0][0])
        elif len(repository.graph.nodes) > 0:
            start_node = str(list(repository.graph.nodes)[0])

    if not start_node:
        start_node = "Application Entrypoint"

    flow_nodes = []
    flow_edges = []
    if hasattr(repository, "graph") and repository.graph and start_node in repository.graph:
        analyzer = FlowAnalyzer(repository.graph)
        flow_nodes, flow_edges = analyzer.trace_flow_with_edges(start_node, depth=5, max_nodes=18)

    if not flow_nodes and hasattr(repository, "graph") and repository.graph:
        flow_nodes = list(repository.graph.nodes)[:10]

    # Filter out noisy python builtins from the edges list
    filtered_edges = [
        (s, d, r) for s, d, r in flow_edges
        if not any(d.startswith(p) for p in ["CALL::len", "CALL::print", "CALL::str", "CALL::dict", "CALL::list", "CALL::round", "CALL::time"])
    ]
    if not filtered_edges:
        filtered_edges = flow_edges

    edges_text = "\n".join(
        f"  {s} --[{r}]--> {d}"
        for s, d, r in filtered_edges[:12]
    ) if filtered_edges else f"  {start_node} --[executes]--> Core Execution Pipeline"

    nodes_text = "\n".join(
        f"  - {node}"
        for node in flow_nodes[:12]
    )

    llm = LLMProvider()
    prompt = f"""You are an expert software architect explaining codebase execution paths and call flows.

The user asked: "{question}"
Target Repository: {repository_name or "Active Repository"}

AST Dependency Graph Trace starting from primary entrypoint: `{start_node}`

Call Connections / Traversed Edges:
{edges_text}

Traced Code Entities:
{nodes_text}

Instructions:
1. FIRST, generate a rich, multi-step, syntactically valid Mermaid flowchart inside a ```mermaid fenced codeblock.
   - Use `flowchart TD`.
   - Always wrap node labels in double quotes, e.g.:
     A["Entrypoint: {start_node.split('::')[-1]}"] --> B["Processing Step"]
     B --> C["Downstream Handler"]
   - Do NOT output trivial 1-node or 2-node diagrams. Detail the caller-to-callee pipeline and data flow based on the traced components and architecture.
2. SECOND, explain this flow in clear, technical, plain English. Describe what each step does, how components connect, and the runtime lifecycle.
"""

    state["answer"] = llm.generate(prompt)
    return state

