import os
from google import genai

class EmbeddingService:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    def _entity_to_text(self, entity) -> str:
        """Convert a CodeEntity to the text string that will be embedded."""
        return (
            f"Type: {entity.entity_type}\n"
            f"Name: {entity.name}\n"
            f"Code: {entity.content[:1000]}"   # cap at 1000 chars to keep prompts short
        )

    def embed_text(self, text: str) -> list:
        response = self.client.models.embed_content(
            model="gemini-embedding-2",
            contents=text
        )
        return response.embeddings[0].values

    def embed_entity(self, entity) -> list:
        return self.embed_text(self._entity_to_text(entity))

    def embed_entities(self, entities: list) -> list:
        """Batch-encode all entities in one model call via Gemini API."""
        from app.embeddings.models.embedded_entity import EmbeddedEntity

        if not entities:
            return []

        # Build all texts at once
        texts = [self._entity_to_text(e) for e in entities]

        vectors = []
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            response = self.client.models.embed_content(
                model="gemini-embedding-2",
                contents=batch_texts
            )
            for emb in response.embeddings:
                vectors.append(emb.values)

        return [
            EmbeddedEntity(entity_id=entity.id, vector=vec)
            for entity, vec in zip(entities, vectors)
        ]