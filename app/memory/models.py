"""Memory models module."""
from dataclasses import dataclass


@dataclass
class Message:

    role: str

    content: str