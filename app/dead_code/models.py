"""Dead code models."""
from dataclasses import dataclass
from typing import Optional


@dataclass
class DeadCodeFinding:

    node_id: str

    node_type: str

    file_path: str

    reason: str

    name: str = ""

    start_line: Optional[int] = None

    end_line: Optional[int] = None

    # "high": private and never referenced; "medium": public, so code outside
    # the repository may still use it; "low": may override an inherited method
    confidence: str = "medium"
