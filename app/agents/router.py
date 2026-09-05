"""Router module for agents."""

def router_node(state):
    if state.get("approval_needed"):
        state["route"] = "await_approval"
        return state

    question = state.get("question", "").lower()

    # PR is checked before security_fix because queries like
    # "create a pull request to fix security vulnerabilities" contain
    # both "pull request" and "fix security" — the PR intent must win.
    if "pull request" in question or "create pr" in question or "generate pr" in question:
        state["route"] = "pr"
    elif "architecture diagram" in question or "dependency diagram" in question or "visualize repository" in question:
        state["route"] = "architecture_diagram"
    elif "architecture" in question:
        state["route"] = "architecture"
    elif "flow" in question or "happens when" in question:
        state["route"] = "flow"
    elif "documentation" in question or "document" in question:
        state["route"] = "documentation"
    elif "fix security" in question or "suggest fixes" in question or "remediation" in question:
        state["route"] = "security_fix"
    elif "security" in question or "audit" in question:
        state["route"] = "security"
    elif "dead code" in question or "unused code" in question or "unused functions" in question:
        state["route"] = "dead_code"
    elif "uml" in question or "diagram" in question or "class diagram" in question:
        state["route"] = "uml"
    elif "compare" in question:
        state["route"] = "comparison"
    elif "evolution" in question:
        state["route"] = "evolution"
    else:
        state["route"] = "chat"

    return state
