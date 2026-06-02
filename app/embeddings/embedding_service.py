from sentence_transformers import SentenceTransformer

# Batch size for embedding — tune down if you hit OOM on CPU
EMBED_BATCH_SIZE = 64


class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer(
            "BAAI/bge-small-en-v1.5"
        )

    def _entity_to_text(self, entity) -> str:
        """Convert a CodeEntity to the text string that will be embedded."""
        return (
            f"Type: {entity.entity_type}\n"
            f"Name: {entity.name}\n"
            f"Code: {entity.content[:1000]}"   # cap at 1000 chars to keep prompts short
        )

    def embed_text(self, text: str) -> list:
        return self.model.encode(text, show_progress_bar=False).tolist()

    def embed_entity(self, entity) -> list:
        return self.embed_text(self._entity_to_text(entity))

    def embed_entities(self, entities: list) -> list:
        """Batch-encode all entities in one model call — 10-20x faster than one-by-one."""
        from app.embeddings.models.embedded_entity import EmbeddedEntity

        if not entities:
            return []

        # Build all texts at once
        texts = [self._entity_to_text(e) for e in entities]

        # Encode in one batched call
        vectors = self.model.encode(
            texts,
            batch_size=EMBED_BATCH_SIZE,
            show_progress_bar=True,
            normalize_embeddings=True,
        )

        return [
            EmbeddedEntity(entity_id=entity.id, vector=vec.tolist())
            for entity, vec in zip(entities, vectors)
        ]