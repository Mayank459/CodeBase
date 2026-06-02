from pydantic import BaseModel

class ChatRequest(BaseModel):
    repository_name:str

    question:str