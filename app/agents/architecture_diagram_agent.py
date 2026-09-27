"""Architecture diagram agent module."""
from app.storage.repository_registry import repository_registry
from app.uml.architecture_diagram import ArchitectureDiagramGenerator


def architecture_diagram_node(state):
    repository = repository_registry.get(state["repository_name"])

    if not repository:
        state["answer"] = "Repository not indexed. Please index it first."
        return state

    # "dependency diagram" and "architecture diagram" both route here; they used
    # to return the same picture.
    question = (state.get("question") or "").lower()
    kind = "dependencies" if ("dependenc" in question or "coupling" in question) else "architecture"
    state["answer"] = ArchitectureDiagramGenerator(repository).generate(kind=kind)

    return state
