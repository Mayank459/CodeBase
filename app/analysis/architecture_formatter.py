"""Architecture formatter module."""

class ArchitectureFormatter:

    def format(
        self,
        architecture
    ):
        lines = []

        lines.append(
            "# Repository Architecture\n"
        )

        lines.append(
            f"Graph Nodes: "
            f"{architecture['graph_nodes']}"
        )

        lines.append(
            f"Graph Edges: "
            f"{architecture['graph_edges']}"
        )

        lines.append(
            "\nMost Important Components:\n"
        )

        for node, degree in (
            architecture[
                "top_nodes"
            ][:10]
        ):

            lines.append(
                f"- {node} "
                f"(connections={degree})"
            )

        lines.append(
            "\nModules:\n"
        )

        for module, info in (
            architecture[
                "modules"
            ].items()
        ):
            # Convert Windows or Linux paths to simple filenames
            module_name = (
                module.replace("\\", "/").split("/")[-1]
            )

            lines.append(
                f"- {module_name}"
            )

            lines.append(
                f"  Classes: "
                f"{info['classes']}"
            )

            lines.append(
                f"  Functions: "
                f"{info['functions']}"
            )

        return "\n".join(lines)
