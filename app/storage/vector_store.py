"""Vector store module."""
import uuid
from typing import List, Optional

from qdrant_client.http import models
from qdrant_client.models import (PointStruct, Filter, FieldCondition, MatchValue)

from app.storage.qdrant_client import get_client
from app.embeddings.models.embedded_entity import EmbeddedEntity


COLLECTION_NAME = "codebase_entities_cohere"


def create_collection():
    """Create the Qdrant collection and payload indexes if they don't exist."""
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

    # Ensure payload index on repository_name exists for filtering/deleting
    try:
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="repository_name",
            field_schema=models.PayloadSchemaType.KEYWORD
        )
    except Exception:
        # Index already exists or cannot be created
        pass


# Fixed namespace so a repository's entity always maps to the same point id
_POINT_NAMESPACE = uuid.UUID("6f1c2d3e-9a4b-4c5d-8e7f-0a1b2c3d4e5f")


def point_id(repository_name: str, graph_node_id: str) -> str:
    """Deterministic, repository-scoped point id.

    Entity ids restart at 1 for every repository, so using them as point ids
    made each newly indexed repository overwrite the previous one's vectors.
    """
    return str(uuid.uuid5(_POINT_NAMESPACE, f"{repository_name}|{graph_node_id}"))


def store_entities(repository_name: str, entities, embedded_entities, source_url: Optional[str] = None):
    client = get_client()
    points = []

    for entity, embedded in zip(entities, embedded_entities):
        points.append(
            PointStruct(
                id=point_id(repository_name, entity.graph_node_id),
                vector=embedded.vector,
                payload={
                    "repository_name": repository_name,
                    "graph_node_id": entity.graph_node_id,
                    "entity_type": entity.entity_type,
                    "name": entity.name,
                    "file_path": entity.file_path,
                    "content": entity.content,
                    "start_line": getattr(entity, "start_line", None),
                    "end_line": getattr(entity, "end_line", None),
                    # lets a restarted server re-clone and rebuild the graph
                    "source_url": source_url,
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
    create_collection()
    try:
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
    except Exception as e:
        print(f"[vector_store] Warning: delete_repository failed for '{repository_name}': {e}")

def count_repository_points(repository_name: str) -> int:
    """Number of stored vectors for a repository (0 when none or on error)."""
    try:
        return get_client().count(
            collection_name=COLLECTION_NAME,
            count_filter=Filter(must=[FieldCondition(key="repository_name", match=MatchValue(value=repository_name))]),
            exact=True,
        ).count
    except Exception:
        return 0


def get_repository_source_url(repository_name: str) -> Optional[str]:
    """The clone URL recorded with a repository's vectors, if any."""
    try:
        points, _ = get_client().scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=Filter(must=[FieldCondition(key="repository_name", match=MatchValue(value=repository_name))]),
            limit=1,
            with_payload=["source_url"],
            with_vectors=False,
        )
        return (points[0].payload or {}).get("source_url") if points else None
    except Exception:
        return None


def list_repository_names(limit: int = 1000) -> List[str]:
    """Distinct repository names present in the vector store."""
    try:
        client = get_client()
        facet = getattr(client, "facet", None)
        if facet:
            res = facet(collection_name=COLLECTION_NAME, key="repository_name", limit=limit)
            return [h.value for h in res.hits]
    except Exception:
        pass
    return []
