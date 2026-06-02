from dataclasses import dataclass, field

from .parsed_method import ParsedMethod


@dataclass
class ParsedClass:

    name: str

    start_line: int

    end_line: int

    code: str

    methods: list[ParsedMethod] = field(default_factory=list)