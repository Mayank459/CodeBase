from dataclasses import dataclass

@dataclass
class StreamEvent:
    event_type: str
    message: str
