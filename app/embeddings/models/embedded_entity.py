from dataclasses import dataclass


@dataclass
class EmbeddedEntity:

    entity_id: int

    vector: list[float]