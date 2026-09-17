"""Structured Router module for agents with multi-intent recognition and fallback."""
from typing import Dict, Any, List


def classify_intents(question: str) -> Dict[str, Any]:
    """
    Extract structured primary and secondary intents from user query.
    Returns:
      {
        "intent": str,
        "secondary_intents": list[str],
        "requires_retrieval": bool,
        "requires_write_access": bool,
        "confidence": float
      }
    """
    q = question.lower()
    intents = []

    # Check for PR / Write Intent (highest precedence)
    if any(k in q for k in ["pull request", "create pr", "generate pr", "submit pr"]):
        intents.append("pr")

    # Architecture & Diagrams
    if any(k in q for k in ["architecture diagram", "dependency diagram", "visualize repository", "visualize deps"]):
        intents.append("architecture_diagram")
    elif any(k in q for k in ["architecture", "overview", "components", "structure", "authentication", "auth"]):
        intents.append("architecture")


    # Flow & Trace
    if any(k in q for k in ["flow", "happens when", "trace call", "sequence", "lifecycle"]):
        intents.append("flow")

    # Documentation
    if any(k in q for k in ["documentation", "document", "generate docs", "docstring", "readme"]):
        intents.append("documentation")

    # Security Fix & Vulnerability Remediation
    if any(k in q for k in ["fix security", "suggest fixes", "remediation", "patch vulnerability", "fix finding"]):
        intents.append("security_fix")
    elif any(k in q for k in ["security", "audit", "vulnerabilities", "cve", "injection", "secret"]):
        intents.append("security")

    # Dead Code
    if any(k in q for k in ["dead code", "unused code", "unused functions", "unreferenced"]):
        intents.append("dead_code")

    # UML
    if any(k in q for k in ["uml", "class diagram", "er diagram"]):
        intents.append("uml")

    # Comparison & Evolution
    if "compare" in q or "diff between" in q:
        intents.append("comparison")
    if "evolution" in q or "history" in q or "churn" in q or "commit history" in q:
        intents.append("evolution")

    primary = intents[0] if intents else "chat"
    secondary = intents[1:] if len(intents) > 1 else []

    requires_write = primary in ["pr"]
    requires_retrieval = primary not in ["chat"] or len(q.split()) > 4

    return {
        "intent": primary,
        "secondary_intents": secondary,
        "requires_retrieval": requires_retrieval,
        "requires_write_access": requires_write,
        "confidence": 0.95 if intents else 0.70
    }


def router_node(state):
    """
    LangGraph router node assigning primary route while recording structured decision.
    """
    if state.get("approval_needed"):
        state["route"] = "await_approval"
        return state

    question = state.get("question", "")
    decision = classify_intents(question)

    state["route"] = decision["intent"]
    state["routing"] = decision
    state["secondary_intents"] = decision["secondary_intents"]
    return state
