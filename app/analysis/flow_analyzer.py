"""Flow analyzer module."""
import networkx as nx


class FlowAnalyzer:

    def __init__(
        self,
        graph
    ):
        self.graph = graph

    def trace_flow(
        self,
        start_node,
        depth=5
    ):

        visited = []

        queue = [
            (
                start_node,
                0
            )
        ]

        seen = set()

        while queue:

            node, level = queue.pop(0)

            if node in seen:
                continue

            seen.add(node)

            visited.append(node)

            if level >= depth:
                continue

            for nxt in self.graph.successors(node):
                queue.append((nxt, level + 1))

        return visited

    def trace_flow_with_edges(
        self,
        start_node,
        depth=5,
        max_nodes=20
    ):
        visited = []
        edges = []
        queue = [(start_node, 0)]
        seen = set()

        while queue and len(visited) < max_nodes:
            node, level = queue.pop(0)
            if node in seen:
                continue

            seen.add(node)
            visited.append(node)

            if level >= depth:
                continue

            for nxt in self.graph.successors(node):
                edge_data = self.graph.get_edge_data(node, nxt) or {}
                relation = edge_data.get("relation", "calls")
                nxt_type = self.graph.nodes.get(nxt, {}).get("type", "")
                
                # Exclude noisy constant/variable entities from execution flowcharts
                if nxt_type == "variable":
                    continue

                edges.append((node, nxt, relation))
                if nxt not in seen:
                    queue.append((nxt, level + 1))

        return visited, edges