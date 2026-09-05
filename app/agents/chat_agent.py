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

    # Build a compact conversation history string for context
    history = state.get("history") or []
    history_str = "\n".join(
        f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '')}"
        for m in history[-6:]  # keep the last few turns to bound context
    )

    chat = RepositoryChat(repository.graph, repository_name=repository_name)
    answer = chat.ask(question, history=history_str)

    state["answer"] = answer
    return state
