"""Graph node and edge types."""
from enum import Enum

class NodeType(Enum):
    FILE = "file"
    CLASS = "class"
    FUNCTION = "function"
    VARIABLE = "variable"
    MODULE = "module"

class EdgeType(Enum):
    CONTAINS = "contains"
    CALLS = "calls"
    IMPORTS = "imports"
    INHERITS = "inherits"
