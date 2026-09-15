import uuid
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.repository import router as repository_router
from app.api.routes.agent import router as agent_router
from app.observability.metrics import metrics

app = FastAPI(
    title = "Codebase RAG Assistant",
    description = "AI-Powered Repository Understanding & Developer Intelligence Platform"
)

# Correlation ID Middleware
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    repository_router,
    prefix = "/repository",
    tags = ["Repository"]
)

app.include_router(
    agent_router,
    prefix = "/agent",
    tags = ["Agent"]
)

@app.get("/")
def root():
    return {
        "message": "Codebase RAG Assistant API Running",
        "version": "1.1.0"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "codebase-api"
    }

@app.get("/metrics")
def get_metrics():
    """Prometheus metrics scrape endpoint."""
    content, media_type = metrics.export_metrics()
    return Response(content=content, media_type=media_type)


