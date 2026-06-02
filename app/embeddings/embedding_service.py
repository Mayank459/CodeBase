from fastembed import TextEmbedding

class EmbeddingService:
    def __init__(self):
        # BAAI/bge-small-en-v1.5 is standard, produces 384d vectors
        # Set threads=1 to prevent ONNX from spawning multiple threads and spiking memory on Render free tier
        self.model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5", threads=1)

    def _entity_to_text(self, entity) -> str:
        """Convert a CodeEntity to the text string that will be embedded."""
        return (
            f"Type: {entity.entity_type}\n"
            f"Name: {entity.name}\n"
            f"Code: {entity.content[:1000]}"   # cap at 1000 chars to keep prompts short
        )

    def embed_text(self, text: str) -> list:
        # fastembed returns a generator of numpy arrays
        generator = self.model.embed([text], batch_size=1)
        return next(generator).tolist()

    def embed_entity(self, entity) -> list:
        return self.embed_text(self._entity_to_text(entity))

    def embed_entities(self, entities: list) -> list:
        """Batch-encode all entities in one model call via fastembed."""
        from app.embeddings.models.embedded_entity import EmbeddedEntity

        if not entities:
            return []

        # Build all texts at once
        texts = [self._entity_to_text(e) for e in entities]

        # Use an ultra-small batch size (8) to prevent OOM memory spikes during ONNX processing
        vectors = [vec.tolist() for vec in self.model.embed(texts, batch_size=8)]

        return [
            EmbeddedEntity(entity_id=entity.id, vector=vec)
            for entity, vec in zip(entities, vectors)
        ]