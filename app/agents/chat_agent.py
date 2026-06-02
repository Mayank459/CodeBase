"""Chat agent module."""
from app.chat.repository_chat import RepositoryChat
from app.storage.repository_registry import repository_registry


def chat_node(state):
    repository_name = state.get("repository_name")
    question = state.get("question")

    repository = repository_registry.get(repository_name)
    if not repository:
        state["answer"] = "Repository not indexed. Please index it first using POST /repository/parse."
        return state

    chat = RepositoryChat(repository.graph)
    answer = chat.ask(question)

    state["answer"] = answer
    return state
