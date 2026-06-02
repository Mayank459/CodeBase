"""UML agent module."""
from app.uml.class_diagram import ClassDiagramBuilder
from app.uml.mermaid_generator import MermaidGenerator
from app.storage.repository_registry import repository_registry

def uml_node(
    state
):

    repository = (
        repository_registry.get(
            state[
                "repository_name"
            ]
        )
    )

    if not repository:
        state["answer"] = "Repository not indexed. Please index it first."
        return state

    builder = (
        ClassDiagramBuilder(
            repository
        )
    )

    classes = (
        builder.get_classes()
    )

    generator = (
        MermaidGenerator()
    )

    state["answer"] = (
        generator.generate(
            classes
        )
    )

    return state
