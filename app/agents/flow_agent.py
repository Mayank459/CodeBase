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
        state["answer"] = "Repository not indexed. Please index it first."
        return state

    # Find the most relevant entry-point node via semantic search
    start_node = ""
    try:
        searcher = SemanticSearcher()
        results = searcher.search(query=question, top_k=3, repository_name=repository_name)
        if results and results[0].payload:
            start_node = results[0].payload.get("graph_node_id", "")
    except Exception:
        results = []

    # Fallback to finding central or entrypoint nodes in the AST graph
    if not start_node and hasattr(repository, "graph") and repository.graph:
        for node in repository.graph.nodes:
            lower = str(node).lower()
            if any(k in lower for k in ["app", "main", "api", "server", "index", "run", "streamlit", "core"]):
                start_node = str(node)
                break
        if not start_node and len(repository.graph.nodes) > 0:
            start_node = str(list(repository.graph.nodes)[0])

    if not start_node:
        start_node = "Application Entrypoint"

    flow_nodes = []
    if hasattr(repository, "graph") and repository.graph and start_node in repository.graph:
        analyzer = FlowAnalyzer(repository.graph)
        flow_nodes = analyzer.trace_flow(start_node, depth=6)

    if not flow_nodes and hasattr(repository, "graph") and repository.graph:
        flow_nodes = list(repository.graph.nodes)[:8]

    # Build a human-readable flow list
    flow_text = "\n".join(
        f"  {'→ ' if i > 0 else '  '}{node}"
        for i, node in enumerate(flow_nodes)
    ) if flow_nodes else f"  {start_node} → Execution Pipeline → Response"

    llm = LLMProvider()
    prompt = f"""You are an expert software engineer explaining call flows.

The user asked: "{question}"

I traced the following execution path through the dependency graph starting from `{start_node}`:

{flow_text}

First, generate a clean, valid Mermaid diagram (inside a ```mermaid fenced block, using either `flowchart TD` or `sequenceDiagram`) illustrating the step-by-step caller-to-callee execution path.
Next, explain this flow in clear, plain English. Describe what each step does and how the components connect. 
If the trace seems incomplete, note that and explain what you can infer from the available information.
"""

    state["answer"] = llm.generate(prompt)
    return state
