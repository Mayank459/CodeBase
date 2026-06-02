"""Repository chat module."""
from app.chat.context_builder import (
    ContextBuilder
)

from app.chat.prompts import (
    REPOSITORY_CHAT_PROMPT
)

from app.chat.llm_provider import (
    LLMProvider
)

from app.retrieval.hybrid_retriever import (
    HybridRetriever
)


class RepositoryChat:

    def __init__(
        self,
        graph
    ):

        self.retriever = (
            HybridRetriever(graph)
        )

        self.context_builder = (
            ContextBuilder()
        )

        self.llm = (
            LLMProvider()
        )

    def ask(
        self,
        question,
        history=""
    ):

        retrieval_result = (
            self.retriever.retrieve(
                question
            )
        )

        context = (
            self.context_builder.build(
                retrieval_result
            )
        )

        prompt = (
            REPOSITORY_CHAT_PROMPT
            .format(
                context=context,
                question=question,
                history=history
            )
        )

        return self.llm.generate(
            prompt
        )