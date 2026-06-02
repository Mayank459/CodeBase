"""Dead code models."""
from dataclasses import dataclass


@dataclass
class DeadCodeFinding:

    node_id: str

    node_type: str

    file_path: str

    reason: str