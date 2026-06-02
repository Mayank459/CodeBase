def await_approval_node(
    state
):

    state["answer"] = """
Approval Required

Review generated patches.

Use /agent/approve
to continue.
"""

    return state
