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
class DocstringRequest(BaseModel):
    repository_name: str
    symbol_id: str          # e.g. "src/requests/sessions.py::Session::send"
    style: str = "google"   # "google" or "numpy"

class RefsRequest(BaseModel):
    repo_url: str

class VersionCompareRequest(BaseModel):
    repo_url: str
    base: str       # older tag or branch
    head: str       # newer tag or branch ("HEAD" = default branch)
