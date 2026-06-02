from dataclasses import dataclass
from pathlib import Path

@dataclass
class RepositoryFile:
    path:str
    extension: str
    language:str
    size:int
