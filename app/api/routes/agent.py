from fastapi import APIRouter
from pydantic import BaseModel
from app.agents.graph_builder import graph
from app.api.schemas.repository import EvolutionRequest

router = APIRouter()

class AgentChatRequest(BaseModel):
    repository_name: str
    question: str

class ComparisonRequest(BaseModel):
    repositories: list[str]

from app.agents.comparison_agent import comparison_node

@router.post("/chat")
async def chat_with_agent(
    request: AgentChatRequest
):
    result = graph.invoke(
        {
            "repository_name": request.repository_name,
            "question": request.question
        }
    )
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
        
        for event in graph.stream(
            state
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
    from app.hitl.resume_handler import resume_handler
    return resume_handler.resume(
        request_id=request.request_id,
        approved=request.approved
    )
