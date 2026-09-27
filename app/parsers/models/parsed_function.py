from dataclasses import dataclass, field
from .parsed_call import ParsedCall

@dataclass
class ParsedFunction:
    name: str
    start_line: int
    end_line: int
    code: str
    calls: list[ParsedCall] = field(default_factory=list)
    decorators: list[str] = field(default_factory=list)
    signature: str = ""
    return_type: str = ""
    docstring: str = ""
    is_async: bool = False