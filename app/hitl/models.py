from dataclasses import dataclass

@dataclass
class ApprovalRequest:

    request_id: str

    repository_name: str

    action_type: str

    payload: dict
