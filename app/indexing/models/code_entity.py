from dataclasses import dataclass
from typing import Optional


@dataclass
class CodeEntity:

    id: int

    graph_node_id: str

    entity_type: str

    name: str

    file_path: str

    content: str

    start_line: Optional[int] = None

    end_line: Optional[int] = None
