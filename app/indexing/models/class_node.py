from dataclasses import dataclass

@dataclass
class ClassNode:
    name:str
    file_path:str
    start_line:int
    end_line:int
    code:str