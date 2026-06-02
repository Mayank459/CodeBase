"""Conversation memory module."""
from collections import deque

from app.memory.models import (
    Message
)


class ConversationMemory:

    def __init__(
        self,
        max_messages=20
    ):

        self.messages = deque(
            maxlen=max_messages
        )

    def add_user_message(
        self,
        content
    ):

        self.messages.append(
            Message(
                role="user",
                content=content
            )
        )

    def add_assistant_message(
        self,
        content
    ):

        self.messages.append(
            Message(
                role="assistant",
                content=content
            )
        )

    def get_history(self):

        return list(
            self.messages
        )