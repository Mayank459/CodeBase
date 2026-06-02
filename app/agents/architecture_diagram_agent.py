"""Architecture diagram agent module."""
from app.storage.repository_registry import repository_registry
from app.uml.architecture_diagram import ArchitectureDiagramGenerator

def architecture_diagram_node(state):
    repository = repository_registry.get(state["repository_name"])

    if not repository:
        state["answer"] = "Repository not indexed. Please index it first."
        return state

    generator = ArchitectureDiagramGenerator(repository)
    diagram = generator.generate()

    state["answer"] = diagram

    return state
