from dataclasses import dataclass, field
from .parsed_call import ParsedCall

@dataclass
class ParsedMethod:
    name: str
    start_line: int
    end_line: int
    code: str
    calls: list[ParsedCall] = field(default_factory=list)