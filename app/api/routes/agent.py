from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.api.dependencies.auth import get_current_user
from app.agents.graph_builder import graph
from app.api.schemas.repository import EvolutionRequest

router = APIRouter(dependencies=[Depends(get_current_user)])

class AgentChatRequest(BaseModel):
    repository_name: str
    question: str
    history: list[dict] = []
    thread_id: str = ""  # stable ID so interrupted (HITL) runs can be resumed

class ComparisonRequest(BaseModel):
    repositories: list[str]

from app.agents.comparison_agent import comparison_node

from app.guardrails.safety_manager import safety_manager
from app.observability.metrics import metrics

@router.post("/chat")
async def chat_with_agent(
    request: AgentChatRequest
):
    # 1. Input Guardrail Check (Prompt Injection & Sanitization)
    in_check = safety_manager.validate_input(request.question)
    if not in_check.passed:
        metrics.record_guardrail_violation("prompt_injection")
        metrics.record_request(endpoint="/agent/chat", status="blocked")
        return {
            "answer": f"⚠️ **Guardrail Notice:** Request intercepted by safety policy ({in_check.reason}). Please rephrase your codebase query.",
            "route": "blocked_by_guardrail",
            "status": "blocked"
        }

    # 2. Execute Graph with Telemetry
    config = {"configurable": {"thread_id": request.thread_id or "default"}}
    with metrics.measure_latency("chat_workflow"):
        result = graph.invoke(
            {
                "repository_name": request.repository_name,
                "question": in_check.sanitized_input or request.question,
                "history": request.history
            },
            config=config,
        )

    # Convert generator or non-string answers to string to ensure JSON serialization
    import types
    if "answer" in result:
        ans = result["answer"]
        if isinstance(ans, types.GeneratorType):
            result["answer"] = "".join(str(chunk) for chunk in ans)
        elif not isinstance(ans, str):
            result["answer"] = str(ans)

    # 3. Output Guardrail Check (Secret Scrubbing & Citation Grounding)
    if "answer" in result and isinstance(result["answer"], str):
        out_check = safety_manager.validate_output(result["answer"])
        result["answer"] = out_check["final_text"]
        if not out_check["passed"]:
            if out_check["secret_violations"]:
                metrics.record_guardrail_violation("secret_leakage")
            if out_check["hallucinated_citations"]:
                metrics.record_guardrail_violation("citation_fail")

    metrics.record_request(endpoint="/agent/chat", status="success")

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
                    # Proper W3C SSE multiline formatting
                    for line in str(ans).split("\n"):
                        yield f"data: {line}\n"
                    yield "\n"

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
