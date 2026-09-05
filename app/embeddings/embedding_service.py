import os
import time
from typing import Callable, Optional
import requests
from dotenv import load_dotenv

load_dotenv()


class EmbeddingService:
    def __init__(self):
        self.api_key = os.getenv("COHERE_API_KEY")
        self.url = "https://api.cohere.com/v1/embed"
        # embed-english-light-v3.0 → 384 dimensions, fast & free
        self.model = "embed-english-light-v3.0"

    def _entity_to_text(self, entity) -> str:
        """Convert a CodeEntity to a compact string for embedding.
        We cap code at 300 chars to keep token count low and stay under
        Cohere trial limits (~100K tokens/minute).
        """
        return (
            f"Type: {entity.entity_type}\n"
            f"Name: {entity.name}\n"
            f"Code: {entity.content[:300]}"
        )

    def _call_api(self, texts: list, input_type: str) -> list:
        """Call Cohere's embed endpoint with retry logic and return a list of float vectors."""
        if not self.api_key:
            self.api_key = os.getenv("COHERE_API_KEY")
            if not self.api_key:
                raise RuntimeError("COHERE_API_KEY is not set in environment or .env file.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": self.model,
            "texts": texts,
            "input_type": input_type,
            "embedding_types": ["float"]
        }

        max_retries = 5
        base_delay = 6
        for attempt in range(max_retries):
            try:
                response = requests.post(self.url, headers=headers, json=data, timeout=60)
                if response.status_code == 429:
                    wait_time = base_delay * (attempt + 1)
                    print(f"[EmbeddingService] Rate limited (429). Retrying in {wait_time}s (attempt {attempt+1}/{max_retries})...")
                    time.sleep(wait_time)
                    continue

                if not response.ok:
                    raise RuntimeError(f"Cohere API Error {response.status_code}: {response.text}")

                return response.json()["embeddings"]["float"]
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    wait_time = base_delay * (attempt + 1)
                    print(f"[EmbeddingService] Network error: {e}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    raise RuntimeError(f"Cohere API request failed after {max_retries} attempts: {e}")

        raise RuntimeError(f"Cohere API rate limit exceeded after {max_retries} retries.")

    def embed_text(self, text: str) -> list:
        """Embed a single query string."""
        return self._call_api([text], input_type="search_query")[0]

    def embed_entity(self, entity) -> list:
        return self._call_api([self._entity_to_text(entity)], input_type="search_document")[0]

    def embed_entities(
        self,
        entities: list,
        on_batch_progress: Optional[Callable[[int, int], None]] = None,
    ) -> list:
        """Batch-encode all entities via Cohere API.

        Uses batch_size=96 (Cohere's max) and a 6-second pause between
        batches to stay safely under the 100K tokens/minute trial limit.
        At ~100 tokens/entity this gives ~96K tokens/min peak usage.
        """
        from app.embeddings.models.embedded_entity import EmbeddedEntity

        if not entities:
            return []

        texts = [self._entity_to_text(e) for e in entities]
        vectors = []
        batch_size = 96
        total_batches = (len(texts) + batch_size - 1) // batch_size

        for b_idx, i in enumerate(range(0, len(texts), batch_size)):
            batch = texts[i:i + batch_size]
            batch_vectors = self._call_api(batch, input_type="search_document")
            vectors.extend(batch_vectors)

            if on_batch_progress:
                on_batch_progress(b_idx + 1, total_batches)

            # Throttle: pause between batches to respect 100K tokens/min limit
            if i + batch_size < len(texts):
                time.sleep(6)

        return [
            EmbeddedEntity(entity_id=entity.id, vector=vec)
            for entity, vec in zip(entities, vectors)
        ]