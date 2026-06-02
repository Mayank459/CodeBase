from fastapi import APIRouter
from app.api.schemas.repository import RepositoryRequest
from app.indexing.repository_loader import clone_repository
from app.indexing.scanner import scan_repository
from app.indexing.stats import generate_stats
from app.api.schemas.chat import (
    ChatRequest
)

router = APIRouter()

@router.post("/clone")
def clone(request: RepositoryRequest):
    repo_path = clone_repository(request.repo_url)
    return {"message": f"Successfully cloned {request.repo_url} to {repo_path}"}

@router.post("/scan")
def scan(request: RepositoryRequest):
    repo_path = clone_repository(request.repo_url)
    files = scan_repository(repo_path)
    return {
        "repository": request.repo_url,
        "files_found": len(files)
    }



@router.post("/parse")
def parse_repository(request: RepositoryRequest):
    from app.services.repository_indexer import RepositoryIndexer
    indexer = RepositoryIndexer()
    result = indexer.index_repository(request.repo_url)
    return result


@router.post("/index-stream")
def index_stream(request: RepositoryRequest):
    """
    Stream indexing progress as Server-Sent Events.
    Each event is a JSON line: data: {"step": ..., "message": ...}
    Final event has step="done" and includes the full result dict.
    """
    import queue
    import threading
    import json
    from fastapi.responses import StreamingResponse
    from app.services.repository_indexer import RepositoryIndexer

    q: queue.Queue = queue.Queue()

    def run():
        try:
            indexer = RepositoryIndexer()
            indexer.index_repository(repo_url=request.repo_url, on_progress=q.put)
        except Exception as exc:
            q.put({"step": "error", "message": str(exc)})
        finally:
            q.put(None)  # sentinel — tells generator to stop

    threading.Thread(target=run, daemon=True).start()

    def generate():
        while True:
            event = q.get()
            if event is None:
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat")
def chat(
    request: ChatRequest
):
    from app.storage.repository_registry import (
        repository_registry
    )

    from app.chat.repository_chat import (
        RepositoryChat
    )

    repository = (
        repository_registry.get(
            request.repository_name
        )
    )

    if repository is None:

        return {
            "error":
            "Repository not indexed"
        }

    chat_service = RepositoryChat(
        repository.graph
    )

    answer = chat_service.ask(
        request.question
    )

    return {
        "answer": answer
    }

@router.post("/debug-search")
def debug_search(request: ChatRequest):
    from app.storage.repository_registry import repository_registry
    from app.retrieval.hybrid_retriever import HybridRetriever
    from app.chat.context_builder import ContextBuilder
    from app.chat.prompts import REPOSITORY_CHAT_PROMPT

    repository = repository_registry.get(request.repository_name)
    if not repository:
        return {"error": "Repository not indexed"}

    retriever = HybridRetriever(repository.graph)
    retrieval_result = retriever.retrieve(request.question)
    
    semantic_payloads = [r.payload for r in retrieval_result.get("semantic_results", [])]
    
    context_builder = ContextBuilder()
    context = context_builder.build(retrieval_result)
    prompt = REPOSITORY_CHAT_PROMPT.format(context=context, question=request.question)

    return {
        "semantic_results": semantic_payloads,
        "graph_context": retrieval_result.get("graph_context", []),
        "final_prompt": prompt
    }

from app.api.schemas.repository import RepositoryNameRequest

@router.post("/architecture")
def architecture(request: RepositoryNameRequest):
    from app.storage.repository_registry import repository_registry
    from app.analysis.architecture_analyzer import ArchitectureAnalyzer

    repository = repository_registry.get(request.repository_name)
    if not repository:
        return {"error": "Repository not indexed"}

    analyzer = ArchitectureAnalyzer(repository)
    return analyzer.analyze()
