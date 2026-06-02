import os
import requests
import time

class EmbeddingService:
    def __init__(self):
        self.api_key = os.getenv("HUGGINGFACE_API_KEY")
        # using the ultra-fast and standard all-MiniLM-L6-v2 (384 dimensions)
        self.url = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"

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
        data = {"inputs": [text]}
        response = requests.post(self.url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()[0]

    def embed_entity(self, entity) -> list:
        return self.embed_text(self._entity_to_text(entity))

    def embed_entities(self, entities: list) -> list:
        """Batch-encode all entities in one model call via Hugging Face API."""
        from app.embeddings.models.embedded_entity import EmbeddedEntity

        if not entities:
            return []

        texts = [self._entity_to_text(e) for e in entities]
        vectors = []
        batch_size = 50  # HuggingFace handles batches nicely
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            data = {"inputs": batch_texts}
            
            # Hugging Face sometimes needs a cold-start sleep
            max_retries = 3
            for attempt in range(max_retries):
                response = requests.post(self.url, headers=headers, json=data)
                
                # If model is loading (503), wait and retry
                if response.status_code == 503 and "estimated_time" in response.text:
                    time.sleep(response.json().get("estimated_time", 20))
                    continue
                    
                if not response.ok:
                    raise RuntimeError(f"Hugging Face API Error: {response.text}")
                    
                batch_vectors = response.json()
                vectors.extend(batch_vectors)
                break

        return [
            EmbeddedEntity(entity_id=entity.id, vector=vec)
            for entity, vec in zip(entities, vectors)
        ]