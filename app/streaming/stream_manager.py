class StreamManager:

    def __init__(self):
        self.events = []

    def emit(
        self,
        event_type,
        message
    ):
        self.events.append(
            {
                "event_type":
                    event_type,
                "message":
                    message
            }
        )

    def get_events(self):
        return self.events

    def clear(self):
        self.events.clear()


# Module-level singleton — importable as `from app.streaming.stream_manager import stream`
stream = StreamManager()
