class ArchitectureDiagramGenerator:

    def __init__(
        self,
        repository_index
    ):
        self.repository_index = (
            repository_index
        )

        self.graph = (
            repository_index.graph
        )

    def generate(self):

        lines = []

        lines.append(
            "graph TD"
        )

        lines.append("")

        for source, target in (
            self.graph.edges()
        ):

            source_name = (
                source.split("::")[-1]
            )

            target_name = (
                target.split("::")[-1]
            )

            lines.append(
                f"{source_name}"
                f" --> "
                f"{target_name}"
            )

        return "\n".join(lines)
