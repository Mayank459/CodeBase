from dataclasses import dataclass

@dataclass
class FunctionNode:
    name: str

    file_path: str

    start_line: int

    end_line: int

    code: str
