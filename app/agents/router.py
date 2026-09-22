"""Structured Router module for agents with Laya System 1 Decision Engine and heuristic fallback."""
import logging
from typing import Dict, Any, List
from app.core.laya_engine import LayaEngine

logger = logging.getLogger(__name__)

ROUTING_QUESTIONS = {
    "intent": {
        "type": "choice",
        "instructions": "Determine the primary developer task or tool needed to resolve this query.",
        "criteria": {
            "pr": "create, review, generate, or submit a pull request or code patch",
            "architecture_diagram": "visual diagram, dependency diagram, visual architecture representation",
            "architecture": "system architecture, high-level components, authentication structure, overview",
            "flow": "execution flow, call trace, runtime sequence, lifecycle analysis",
            "documentation": "generate documentation, write docstrings, update readme",
            "security_fix": "remediate vulnerability, apply security patch, fix finding",
            "security": "security audit, vulnerability scan, CVE detection, credential check",
            "dead_code": "detect unused functions, dead methods, unreferenced code",
            "uml": "generate UML diagrams, class diagrams, sequence diagrams",
            "comparison": "compare two repositories, diff implementations or architecture",
            "evolution": "git history, commit churn, architectural evolution over time",
            "chat": "general coding questions, explanations, codebase Q&A"
        }
    },
    "requires_retrieval": {
        "type": "noul",
        "instructions": "Does this query require looking up specific code snippets, files, or symbols from the repository?"
    }
}


def _classify_intents_heuristic(question: str) -> Dict[str, Any]:
    """Fallback keyword-based intent classifier."""
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
        "confidence": 0.95 if intents else 0.70,
        "engine": "heuristic"
    }


def classify_intents(question: str) -> Dict[str, Any]:
    """
    Extract structured primary and secondary intents from user query using Laya,
    with an automated fallback to keyword heuristics.
    """
    engine = LayaEngine.get_instance()
    if engine.is_available:
        try:
            res = engine.predict(question, ROUTING_QUESTIONS)
            if res and "answers" in res:
                answers = res["answers"]
                primary = answers.get("intent", {}).get("choice", "chat")
                confidence = float(answers.get("intent", {}).get("confidence", 0.85))

                retrieval_answer = answers.get("requires_retrieval", {}).get("choice", "yes")
                requires_retrieval = retrieval_answer in ("yes", True) or len(question.split()) > 4
                requires_write = primary in ["pr"]

                # Extract any secondary intents detected by keyword cross-check
                heuristic_check = _classify_intents_heuristic(question)
                secondaries = [
                    sec for sec in ([heuristic_check["intent"]] + heuristic_check.get("secondary_intents", []))
                    if sec != primary and sec != "chat"
                ]

                routing_meta = res.get("routing", {})

                return {
                    "intent": primary,
                    "secondary_intents": secondaries,
                    "requires_retrieval": requires_retrieval,
                    "requires_write_access": requires_write,
                    "confidence": confidence,
                    "engine": "laya",
                    "routing_metadata": routing_meta
                }
        except Exception as e:
            logger.warning("Laya intent classification error: %s. Falling back to heuristic.", e)

    return _classify_intents_heuristic(question)


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
    state["secondary_intents"] = decision.get("secondary_intents", [])
    return state
