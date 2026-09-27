"""Comparison agent module."""
from app.comparison.profile import compare_repositories, comparison_markdown


def comparison_node(state):
    result = compare_repositories(state.get("repositories", []))
    state["answer"] = comparison_markdown(result)
    return state
