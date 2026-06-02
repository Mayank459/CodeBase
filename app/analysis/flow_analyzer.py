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

            for nxt in (
                self.graph.successors(
                    node
                )
            ):

                queue.append(
                    (
                        nxt,
                        level + 1
                    )
                )

        return visited