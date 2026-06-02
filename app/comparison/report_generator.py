"""Comparison report generator module."""
class ComparisonReportGenerator:

    def generate(
        self,
        comparisons
    ):

        lines = []

        lines.append(
            "# Repository Comparison\n"
        )

        for repo in comparisons:

            lines.append(
                f"Repository: "
                f"{repo.repository_name}"
            )

            lines.append(
                f"Classes: "
                f"{repo.classes}"
            )

            lines.append(
                f"Functions: "
                f"{repo.functions}"
            )

            lines.append(
                f"Methods: "
                f"{repo.methods}"
            )

            lines.append(
                f"Graph Nodes: "
                f"{repo.graph_nodes}"
            )

            lines.append(
                f"Graph Edges: "
                f"{repo.graph_edges}"
            )

            lines.append("")

        return "\n".join(lines)