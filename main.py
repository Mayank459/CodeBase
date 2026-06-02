from fastapi import FastAPI

from app.api.routes.repository import router as repository_router
from app.api.routes.agent import router as agent_router

app = FastAPI(
    title = "Codebase RAG Assistant",
    description = "AI-Powered Repository Understanding & Developer Intelligence Platform"
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
        "message": "Codebase RAG Assistant API Running"
    }

