"""Resume handler module — resumes a paused LangGraph workflow after HITL approval."""
from app.hitl.checkpoint_store import checkpoint_store
from app.agents.graph_builder import graph


class ResumeHandler:
    """
    After a human approves (or rejects) a pending action, this handler
    loads the saved state, injects the approval decision, and resumes
    the compiled LangGraph from where it was interrupted.
    """

    def resume(self, request_id: str, approved: bool) -> dict:
        """
        Resume a paused workflow.

        Args:
            request_id: The ID returned when the graph was interrupted.
            approved:   True if the human approved the action, False to reject.

        Returns:
            The final agent state dict.
        """
        state = checkpoint_store.load(request_id)

        if state is None:
            return {
                "error": f"No pending request found for id={request_id}. "
                         "It may have already been processed or expired."
            }

        # Inject the approval decision into state so pr_node / security_fix_node can read it
        state["approval_needed"] = False
        state["approval_request"] = {
            "request_id": request_id,
            "approved": approved,
        }

        # Resume the graph — LangGraph will continue from the interrupt() call
        try:
            result = graph.invoke(state)
        except Exception as exc:
            checkpoint_store.remove(request_id)
            return {"error": str(exc)}

        checkpoint_store.remove(request_id)
        return result


resume_handler = ResumeHandler()
