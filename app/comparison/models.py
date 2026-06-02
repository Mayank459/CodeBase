"""Comparison models module."""
from dataclasses import dataclass


@dataclass
class RepositoryComparison:

    repository_name: str

    classes: int

    functions: int

    methods: int

    graph_nodes: int

    graph_edges: int