"""Documentation agent module."""
from app.documentation.api_reference import build_reference, reference_to_markdown
from app.storage.repository_registry import repository_registry


def documentation_node(
    state
):
    repository_name = state.get("repository_name")
    repository = repository_registry.get(repository_name)

    if not repository:
        state["answer"] = "Repository not indexed."
        return state

    # A chat answer gets the coverage summary; the Docs tab fetches the full
    # reference from /repository/docs.
    state["answer"] = reference_to_markdown(build_reference(repository), compact=True)

    return state
