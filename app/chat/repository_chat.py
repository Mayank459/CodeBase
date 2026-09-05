"""Repository chat module."""
from typing import Optional
from app.chat.context_builder import ContextBuilder
from app.chat.prompts import REPOSITORY_CHAT_PROMPT
from app.chat.llm_provider import LLMProvider
from app.retrieval.hybrid_retriever import HybridRetriever


class RepositoryChat:

    def __init__(
        self,
        graph,
        repository_name: Optional[str] = None
    ):
        self.repository_name = repository_name
        self.retriever = HybridRetriever(graph, repository_name=repository_name)
        self.context_builder = ContextBuilder()
        self.llm = LLMProvider()

    def ask(
        self,
        question,
        history=""
    ):
        retrieval_result = self.retriever.retrieve(question, repository_name=self.repository_name)
        context = self.context_builder.build(retrieval_result)
        prompt = REPOSITORY_CHAT_PROMPT.format(
            context=context,
            question=question,
            history=history
        )
        return self.llm.generate(prompt)