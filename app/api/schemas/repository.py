from pydantic import BaseModel


class RepositoryRequest(BaseModel):
    repo_url: str
    force: bool = False  # If True, bypass cache and force a fresh re-index

class RepositoryNameRequest(BaseModel):
    repository_name: str

class AgentChatRequest(BaseModel):
    repository_name: str
    question: str

class ComparisonRequest(BaseModel):
    repositories: list[str]

class EvolutionRequest(BaseModel):
    old_repository: str
    new_repository: str