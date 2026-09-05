"""State module for agents."""
from typing import TypedDict, List

class AgentState(TypedDict):
    repository_name: str
    question: str
    route: str
    answer: str
    repositories: List[str]
    old_repository: str
    new_repository: str
    approval_needed: bool
    approval_request: dict
    history: list