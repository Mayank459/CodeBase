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

import os

# CORS Origins configuration
DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://codebase-ys83.onrender.com",
]
env_cors = os.getenv("CORS_ORIGINS", "")
allowed_origins = [orig.strip() for orig in env_cors.split(",") if orig.strip()] if env_cors else DEFAULT_CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?:\/\/.*$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
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


