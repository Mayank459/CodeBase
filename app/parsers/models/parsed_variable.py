from dataclasses import dataclass


@dataclass
class ParsedVariable:

    name: str

    value: str | None

    start_line: int

    end_line: int