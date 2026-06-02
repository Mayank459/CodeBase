from dataclasses import dataclass


@dataclass
class CodeEntity:

    id: int

    graph_node_id: str

    entity_type: str

    name: str

    file_path: str

    content: str