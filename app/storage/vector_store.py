"""Vector store module."""
from typing import List

from qdrant_client.http import models

from app.storage.qdrant_client import get_client
from app.embeddings.models.embedded_entity import EmbeddedEntity


COLLECTION_NAME = "codebase_entities_fastembed"


def create_collection():
    """Create the Qdrant collection if it doesn't exist."""
    client = get_client()
    collections = client.get_collections().collections
    if not any(c.name == COLLECTION_NAME for c in collections):
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=384,
                distance=models.Distance.COSINE
            )
        )

# pyrefly: ignore [missing-import]
from qdrant_client.models import (PointStruct, Filter, FieldCondition, MatchValue)
def store_entities(repository_name: str, entities, embedded_entities):
    client = get_client()
    points = []

    for entity,embedded in zip(entities,embedded_entities):
        points.append(
            PointStruct(
                id = entity.id,
                vector = embedded.vector,
                payload = {
                    "repository_name": repository_name,
                    "graph_node_id": entity.graph_node_id,
                    "entity_type": entity.entity_type,
                    "name" : entity.name,
                    "file_path": entity.file_path,
                    "content" : entity.content
                }
            )
        )
    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i:i+batch_size]
        client.upsert(collection_name=COLLECTION_NAME, points=batch)


def delete_repository(repository_name: str):
    """Deletes all vector embeddings associated with a specific repository."""
    client = get_client()
    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="repository_name",
                    match=MatchValue(value=repository_name)
                )
            ]
        )
    )