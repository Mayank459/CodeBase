"""Context expander module for controlled bidirectional traversal of the code dependency graph."""
from typing import List, Dict, Any, Optional
import networkx as nx
from app.graph.graph_types import EdgeType


class GraphContextExpander:
    """
    Controlled bidirectional graph context expander.
    Traverses:
      - Callees (outgoing 'calls' edges)
      - Callers (incoming 'calls' edges via predecessors)
      - Definitions & Containers (incoming 'contains' / 'defines')
      - Inherits (outgoing 'inherits')
      - Imports (outgoing 'imports')
    Applies neighbor ranking and context budgeting to prevent LLM context bloat.
    """

    RELATION_WEIGHTS = {
        "caller": 3.0,
        "callee": 2.5,
        "parent_definition": 2.0,
        "inherits": 2.0,
        "import": 1.0,
        "contains": 1.2,
        "generic": 0.5,
    }

    def __init__(self, graph):
        self.graph = graph

    def _get_edge_data(self, u, v) -> List[Dict[str, Any]]:
        """Safely extract edge attributes whether graph is MultiDiGraph or DiGraph."""
        if not self.graph.has_edge(u, v):
            return []
        edge_data = self.graph.get_edge_data(u, v)
        if isinstance(edge_data, dict):
            # In MultiDiGraph, edge_data is {key: {attributes}}
            # In DiGraph, edge_data is {attributes}
            if any(isinstance(val, dict) for val in edge_data.values()):
                return list(edge_data.values())
            return [edge_data]
        return []

    def get_related_nodes(self, node_id: str) -> List[tuple[str, str, float]]:
        """
        Extract direct neighbors of node_id with relationship tags and ranking weights.
        Returns: list of (neighbor_id, relationship_type, rank_weight)
        """
        results = []

        if node_id not in self.graph:
            return results

        # 1. Incoming edges (Predecessors) -> Callers and Parent Containers
        if hasattr(self.graph, "predecessors"):
            for pred in self.graph.predecessors(node_id):
                for attrs in self._get_edge_data(pred, node_id):
                    relation = (attrs.get("relation") or attrs.get("edge_type") or "").lower()
                    if relation in [EdgeType.CALLS.value, "calls"]:
                        results.append((pred, "caller", self.RELATION_WEIGHTS["caller"]))
                    elif relation in [EdgeType.CONTAINS.value, EdgeType.DEFINES.value, "contains", "defines"]:
                        results.append((pred, "parent_definition", self.RELATION_WEIGHTS["parent_definition"]))
                    else:
                        results.append((pred, "incoming_reference", self.RELATION_WEIGHTS["generic"]))

        # 2. Outgoing edges (Successors) -> Callees, Imports, Inherits
        if hasattr(self.graph, "successors"):
            for succ in self.graph.successors(node_id):
                for attrs in self._get_edge_data(node_id, succ):
                    relation = (attrs.get("relation") or attrs.get("edge_type") or "").lower()
                    if relation in [EdgeType.CALLS.value, "calls"]:
                        results.append((succ, "callee", self.RELATION_WEIGHTS["callee"]))
                    elif relation in [EdgeType.IMPORTS.value, "imports"]:
                        # Give slightly lower priority to raw external library imports
                        results.append((succ, "import", self.RELATION_WEIGHTS["import"]))
                    elif relation in [EdgeType.INHERITS.value, "inherits"]:
                        results.append((succ, "inherits", self.RELATION_WEIGHTS["inherits"]))
                    elif relation in [EdgeType.CONTAINS.value, EdgeType.DEFINES.value, "contains", "defines"]:
                        results.append((succ, "contains", self.RELATION_WEIGHTS["contains"]))
                    else:
                        results.append((succ, "outgoing_reference", self.RELATION_WEIGHTS["generic"]))

        # Sort by rank weight descending
        results.sort(key=lambda x: x[2], reverse=True)
        return results

    def expand(
        self,
        graph_node_id: str,
        depth: int = 2,
        max_nodes: int = 25,
        direction: str = "both"
    ) -> List[Dict[str, Any]]:
        """
        Expand graph neighborhood bidirectionally up to depth and max_nodes budget.
        """
        if not self.graph or graph_node_id not in self.graph:
            return []

        context: List[Dict[str, Any]] = []
        visited = set()
        queue = [(graph_node_id, 0, "target", 10.0)]

        while queue and len(context) < max_nodes:
            current, level, relation, weight = queue.pop(0)

            if current in visited:
                continue

            visited.add(current)
            node_data = dict(self.graph.nodes.get(current, {}))

            context.append({
                "node": current,
                "relationship": relation,
                "level": level,
                "weight": weight,
                "metadata": node_data
            })

            if level >= depth:
                continue

            # Bidirectional neighbors
            neighbors = self.get_related_nodes(current)
            for neighbor_id, rel_type, rel_weight in neighbors:
                if neighbor_id not in visited:
                    # Filter by direction if requested
                    if direction == "outgoing" and rel_type not in ["callee", "import", "inherits", "contains"]:
                        continue
                    if direction == "incoming" and rel_type not in ["caller", "parent_definition"]:
                        continue
                    queue.append((neighbor_id, level + 1, rel_type, rel_weight))

        return context