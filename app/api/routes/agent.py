from fastapi import APIRouter
from pydantic import BaseModel
from app.agents.graph_builder import graph
from app.api.schemas.repository import EvolutionRequest

router = APIRouter()

class AgentChatRequest(BaseModel):
    repository_name: str
    question: str
    history: list[dict] = []
    thread_id: str = ""  # stable ID so interrupted (HITL) runs can be resumed

class ComparisonRequest(BaseModel):
    repositories: list[str]

from app.agents.comparison_agent import comparison_node

@router.post("/chat")
async def chat_with_agent(
    request: AgentChatRequest
):
    config = {"configurable": {"thread_id": request.thread_id or "default"}}
    result = graph.invoke(
        {
            "repository_name": request.repository_name,
            "question": request.question,
            "history": request.history
        },
        config=config,
    )

    # Surface Human-in-the-Loop approval requests (e.g. PR creation)
    interrupts = result.get("__interrupt__")
    if interrupts:
        payload = interrupts[0].value
        return {
            "approval_needed": True,
            "request_id": request.thread_id or "default",
            "approval_request": payload,
            "answer": "",
        }

    return result

from fastapi.responses import (
    StreamingResponse
)
from app.streaming.stream_manager import stream

@router.post("/chat-stream")
async def chat_with_agent_stream(
    request: AgentChatRequest
):
    async def generate():
        state = {
            "repository_name": request.repository_name,
            "question": request.question
        }
        config = {"configurable": {"thread_id": request.thread_id or "default"}}

        # Clear any leftover events from previous requests to avoid stale data
        # leaking into this stream (the StreamManager is a shared singleton).
        stream.clear()

        for event in graph.stream(
            state,
            config=config,
        ):
            for ev in stream.get_events():
                yield (
                    "data: "
                    f"{ev['message']}\n\n"
                )
            stream.clear()
            
            node_name = list(event.keys())[0]
            node_state = event[node_name]
            
            if "answer" in node_state:
                ans = node_state["answer"]
                import types
                if isinstance(ans, types.GeneratorType):
                    for token in ans:
                        yield (
                            "data: "
                            f"{token}\n\n"
                        )
                else:
                    yield (
                        "data: "
                        f"{ans}\n\n"
                    )

    return StreamingResponse(
        generate(),
        media_type=
            "text/event-stream"
    )

@router.post("/compare")
async def compare_repositories(
    request: ComparisonRequest
):
    state = {
        "repositories": request.repositories,
        "repository_name": "",
        "question": "",
        "route": "comparison",
        "answer": ""
    }
    
    return comparison_node(state)

@router.post("/evolution")
async def repository_evolution(
    request: EvolutionRequest
):
    state = {
        "repository_name": "",
        "question": "",
        "route": "evolution",
        "answer": "",
        "repositories": [],
        "old_repository": request.old_repository,
        "new_repository": request.new_repository
    }
    
    from app.agents.evolution_agent import evolution_node
    return evolution_node(state)


class ApproveRequest(BaseModel):
    request_id: str
    approved: bool


@router.post("/approve")
async def approve_action(request: ApproveRequest):
    """
    Resume a paused Human-in-the-Loop workflow after the user
    reviews and approves (or rejects) the pending action.
    """
    from langgraph.types import Command
    from app.agents.graph_builder import graph

    config = {"configurable": {"thread_id": request.request_id}}
    try:
        result = graph.invoke(
            Command(resume={"approved": request.approved}),
            config=config,
        )
    except Exception as exc:
        return {"error": f"Failed to resume workflow: {exc}"}

    # A nested interrupt (shouldn't normally happen) — surface it again
    interrupts = result.get("__interrupt__")
    if interrupts:
        return {
            "approval_needed": True,
            "request_id": request.request_id,
            "approval_request": interrupts[0].value,
            "answer": "",
        }

    return result
