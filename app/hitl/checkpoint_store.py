class CheckpointStore:

    def __init__(self):

        self.pending = {}

    def save(
        self,
        request_id,
        state
    ):

        self.pending[
            request_id
        ] = state

    def load(
        self,
        request_id
    ):

        return self.pending.get(
            request_id
        )

    def remove(
        self,
        request_id
    ):

        self.pending.pop(
            request_id,
            None
        )

checkpoint_store = (
    CheckpointStore()
)
