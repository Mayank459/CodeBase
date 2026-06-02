"""Context expander module for traversing the dependency graph."""
class GraphContextExpander:

    def __init__(self, graph):

        self.graph = graph

    def expand(
        self,
        graph_node_id,
        depth=2
    ):

        if graph_node_id not in self.graph:
            return []

        context = []

        visited = set()

        queue = [(graph_node_id, 0)]

        while queue:

            current, level = queue.pop(0)

            if current in visited:
                continue

            visited.add(current)

            node_data = self.graph.nodes[
                current
            ]

            context.append(
                {
                    "node": current,
                    "metadata": node_data
                }
            )

            if level >= depth:
                continue

            for neighbor in (
                self.graph.successors(
                    current
                )
            ):

                queue.append(
                    (
                        neighbor,
                        level + 1
                    )
                )

        return context