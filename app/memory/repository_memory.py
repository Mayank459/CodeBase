"""Repository memory module."""
from app.memory.conversation_memory import (
    ConversationMemory
)


class RepositoryMemoryStore:

    def __init__(self):

        self.memories = {}

    def get_memory(
        self,
        repository_name
    ):

        if repository_name not in self.memories:

            self.memories[
                repository_name
            ] = ConversationMemory()

        return self.memories[
            repository_name
        ]

repository_memory_store = (
    RepositoryMemoryStore()
)