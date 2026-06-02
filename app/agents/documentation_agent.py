"""Documentation agent module."""
from app.documentation.repository_docs import RepositoryDocumentationGenerator
from app.storage.repository_registry import repository_registry

def documentation_node(
    state
):
    repository_name = state.get("repository_name")
    repository = repository_registry.get(repository_name)

    if not repository:
        state["answer"] = "Repository not indexed."
        return state

    generator = RepositoryDocumentationGenerator()
    
    state["answer"] = generator.generate(repository)

    return state
