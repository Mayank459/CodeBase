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
    searcher = SemanticSearcher()
    results = searcher.search(query=question, top_k=3)

    if not results:
        state["answer"] = "Could not find a relevant entry point for the given question."
        return state

    # Use the top semantic result's graph_node_id as the starting point
    start_node = results[0].payload.get("graph_node_id", "")

    analyzer = FlowAnalyzer(repository.graph)
    flow_nodes = analyzer.trace_flow(start_node, depth=6)

    # Build a human-readable flow list
    flow_text = "\n".join(
        f"  {'→ ' if i > 0 else '  '}{node}"
        for i, node in enumerate(flow_nodes)
    )

    llm = LLMProvider()
    prompt = f"""You are an expert software engineer explaining call flows.

The user asked: "{question}"

I traced the following execution path through the dependency graph starting from `{start_node}`:

{flow_text}

Explain this flow in clear, plain English. Describe what each step does and how the components connect. 
If the trace seems incomplete, note that and explain what you can infer from the available information.
"""

    state["answer"] = llm.generate(prompt)
    return state
