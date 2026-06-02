from dataclasses import dataclass
import networkx as nx

from app.parsers.models.parsed_file import ParsedFile


@dataclass
class RepositoryIndex:

    repository_name: str

    parsed_files: list[ParsedFile]

    graph: nx.DiGraph