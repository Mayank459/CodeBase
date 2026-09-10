from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.repository import router as repository_router
from app.api.routes.agent import router as agent_router

app = FastAPI(
    title = "Codebase RAG Assistant",
    description = "AI-Powered Repository Understanding & Developer Intelligence Platform"
)

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
        "message": "Codebase RAG Assistant API Running"
    }

