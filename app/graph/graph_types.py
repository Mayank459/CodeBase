"""Graph node and edge types."""
from enum import Enum

class NodeType(str, Enum):
    FILE = "file"
    CLASS = "class"
    FUNCTION = "function"
    VARIABLE = "variable"
    MODULE = "module"
    IMPORT = "import"
    CALL = "call"
    ENDPOINT = "endpoint"

class EdgeType(str, Enum):
    CONTAINS = "contains"
    DEFINES = "defines"
    CALLS = "calls"
    IMPORTS = "imports"
    INHERITS = "inherits"
    IMPLEMENTS = "implements"
    DEPENDS_ON = "depends_on"
    ROUTES_TO = "routes_to"

