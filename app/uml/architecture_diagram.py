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

    @staticmethod
    def _escape_label(label):
        """Escape a display label for use inside a mermaid quoted label.

        Labels come from symbols/files and can contain backslashes (Windows
        paths), double quotes (e.g. call names like `"\\n".join`), and other
        characters that would otherwise terminate the quoted string early.
        """
        return label.replace(
            "\\", "\\\\"
        ).replace(
            '"', '\\"'
        )

    @staticmethod
    def _node_id(label, registry):
        """Return a stable, valid flowchart ID for a unique label.

        Bare flowchart node IDs cannot contain quotes, brackets, or some
        punctuation (e.g. `results[0].payload.get` or `"\\n".join` break the
        parser), so every node gets a clean `n1, n2, ...` alias and the real
        text is rendered as a quoted label.
        """
        if label not in registry:
            registry[label] = f"n{len(registry) + 1}"
        return registry[label]

    def generate(self):

        lines = []

        lines.append(
            "graph TD"
        )

        lines.append("")

        node_ids = {}

        for source, target in (
            self.graph.edges()
        ):

            source_label = (
                source.split("::")[-1]
            )

            target_label = (
                target.split("::")[-1]
            )

            lines.append(
                f'{self._node_id(source_label, node_ids)}'
                f'["{self._escape_label(source_label)}"]'
                f" --> "
                f'{self._node_id(target_label, node_ids)}'
                f'["{self._escape_label(target_label)}"]'
            )

        return "\n".join(lines)