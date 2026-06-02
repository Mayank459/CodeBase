import os
import requests

class EmbeddingService:
    def __init__(self):
        self.api_key = os.getenv("COHERE_API_KEY")
        self.url = "https://api.cohere.com/v1/embed"
        # embed-english-light-v3.0 → 384 dimensions, fast & free
        self.model = "embed-english-light-v3.0"

    def _entity_to_text(self, entity) -> str:
        """Convert a CodeEntity to the text string that will be embedded."""
        return (
            f"Type: {entity.entity_type}\n"
            f"Name: {entity.name}\n"
            f"Code: {entity.content[:1000]}"
        )

    def _call_api(self, texts: list, input_type: str) -> list:
        """Call Cohere's embed endpoint and return a list of vectors."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": self.model,
            "texts": texts,
            "input_type": input_type,   # "search_document" for indexing, "search_query" for querying
            "embedding_types": ["float"]
        }
        response = requests.post(self.url, headers=headers, json=data)
        if not response.ok:
            raise RuntimeError(f"Cohere API Error {response.status_code}: {response.text}")
        return response.json()["embeddings"]["float"]

    def embed_text(self, text: str) -> list:
        """Embed a single query string."""
        return self._call_api([text], input_type="search_query")[0]

    def embed_entity(self, entity) -> list:
        return self._call_api([self._entity_to_text(entity)], input_type="search_document")[0]

    def embed_entities(self, entities: list) -> list:
        """Batch-encode all entities via Cohere API (max 96 texts per request)."""
        from app.embeddings.models.embedded_entity import EmbeddedEntity

        if not entities:
            return []

        texts = [self._entity_to_text(e) for e in entities]
        vectors = []
        batch_size = 96  # Cohere's max batch size

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            vectors.extend(self._call_api(batch, input_type="search_document"))

        return [
            EmbeddedEntity(entity_id=entity.id, vector=vec)
            for entity, vec in zip(entities, vectors)
        ]