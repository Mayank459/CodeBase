import uuid

from app.hitl.models import (
    ApprovalRequest
)

class ApprovalManager:

    def create_request(
        self,
        repository_name,
        action_type,
        payload
    ):

        return ApprovalRequest(

            request_id=
                str(
                    uuid.uuid4()
                ),

            repository_name=
                repository_name,

            action_type=
                action_type,

            payload=
                payload
        )
