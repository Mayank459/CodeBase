"""Import node model."""
from dataclasses import dataclass
from typing import Optional

@dataclass
class ImportNode:
    module: str
    name: str
    alias: Optional[str] = None
