from dataclasses import dataclass

@dataclass
class PullRequestDraft:
    title: str
    summary: str
    files_changed: list[str]
    changes: list[str]
    risk_reduction: str
