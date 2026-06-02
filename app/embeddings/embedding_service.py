import os
import requests

class EmbeddingService:
    def __init__(self):
        self.api_key = os.getenv("SILICONFLOW_API_KEY")
        self.url = "https://api.siliconflow.cn/v1/embeddings"
        # BAAI/bge-m3 is extremely high quality and outputs 1024d vectors
        self.model = "BAAI/bge-m3"

    def _entity_to_text(self, entity) -> str:
        """Convert a CodeEntity to the text string that will be embedded."""
        return (
            f"Type: {entity.entity_type}\n"
            f"Name: {entity.name}\n"
            f"Code: {entity.content[:1000]}"   # cap at 1000 chars to keep prompts short
        )

    def embed_text(self, text: str) -> list:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": self.model,
            "input": text,
            "encoding_format": "float"
        }
        response = requests.post(self.url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()["data"][0]["embedding"]

    def embed_entity(self, entity) -> list:
        return self.embed_text(self._entity_to_text(entity))

    def embed_entities(self, entities: list) -> list:
        """Batch-encode all entities in one model call via SiliconFlow API."""
        from app.embeddings.models.embedded_entity import EmbeddedEntity

        if not entities:
            return []

        texts = [self._entity_to_text(e) for e in entities]
        vectors = []
        batch_size = 50  # Batch up to 50 texts per request to respect payload limits
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            data = {
                "model": self.model,
                "input": batch_texts,
                "encoding_format": "float"
            }
            response = requests.post(self.url, headers=headers, json=data)
            
            # Catch authentication/rate limit errors cleanly and raise
            if not response.ok:
                raise RuntimeError(f"SiliconFlow API Error: {response.text}")
                
            batch_vectors = [item["embedding"] for item in response.json()["data"]]
            vectors.extend(batch_vectors)

        return [
            EmbeddedEntity(entity_id=entity.id, vector=vec)
            for entity, vec in zip(entities, vectors)
        ]