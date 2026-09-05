"""Agent graph builder module."""
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.agents.state import AgentState
from app.agents.router import router_node
from app.agents.chat_agent import chat_node
from app.agents.architecture_agent import architecture_node
from app.agents.flow_agent import flow_node
from app.agents.documentation_agent import documentation_node
from app.agents.security_agent import security_node
from app.agents.dead_code_agent import dead_code_node
from app.agents.uml_agent import uml_node
from app.agents.architecture_diagram_agent import architecture_diagram_node
from app.agents.security_fix_agent import security_fix_node
from app.agents.comparison_agent import comparison_node
from app.agents.evolution_agent import evolution_node
from app.agents.await_approval_agent import await_approval_node
from app.agents.pr_agent import pr_node

def build_agent_graph():
    builder = StateGraph(AgentState)

    builder.add_node("router", router_node)
    builder.add_node("chat", chat_node)
    builder.add_node("architecture", architecture_node)
    builder.add_node("flow", flow_node)
    builder.add_node("documentation", documentation_node)
    builder.add_node("security", security_node)
    builder.add_node("security_fix", security_fix_node)
    builder.add_node("dead_code", dead_code_node)
    builder.add_node("uml", uml_node)
    builder.add_node("architecture_diagram", architecture_diagram_node)
    builder.add_node("comparison", comparison_node)
    builder.add_node("evolution", evolution_node)
    builder.add_node("await_approval", await_approval_node)
    builder.add_node("pr", pr_node)

    # Entry point
    builder.add_edge(START, "router")

    builder.add_conditional_edges(
        "router",
        lambda state: state.get("route", "chat"),
        {
            "chat": "chat",
            "architecture": "architecture",
            "flow": "flow",
            "documentation": "documentation",
            "security": "security",
            "security_fix": "security_fix",
            "dead_code": "dead_code",
            "uml": "uml",
            "architecture_diagram": "architecture_diagram",
            "comparison": "comparison",
            "evolution": "evolution",
            "await_approval": "await_approval",
            "pr": "pr"
        }
    )

    # Connect all end nodes to END
    builder.add_edge("chat", END)
    builder.add_edge("architecture", END)
    builder.add_edge("flow", END)
    builder.add_edge("documentation", END)
    builder.add_edge("security", END)
    builder.add_edge("security_fix", END)
    builder.add_edge("dead_code", END)
    builder.add_edge("uml", END)
    builder.add_edge("architecture_diagram", END)
    builder.add_edge("comparison", END)
    builder.add_edge("evolution", END)
    builder.add_edge("await_approval", END)
    builder.add_edge("pr", END)

    return builder.compile(checkpointer=checkpointer)

# In-memory checkpointer enables Human-in-the-Loop resumes (PR approval).
# Note: data is lost on restart; swap for a SQLite/Postgres saver for persistence.
checkpointer = MemorySaver()

# Provide a pre-compiled graph object
graph = build_agent_graph()
