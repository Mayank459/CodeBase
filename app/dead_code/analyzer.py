"""Dead code analyzer."""
from app.dead_code.models import DeadCodeFinding

class DeadCodeAnalyzer:

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

    def find_unused_functions(
        self
    ):

        findings = []

        for node, data in (
            self.graph.nodes(data=True)
        ):

            if (
                data.get("type")
                != "function"
            ):
                continue

            incoming = (
                self.graph.in_degree(
                    node
                )
            )

            if incoming == 1:

                findings.append(
                    DeadCodeFinding(
                        node_id=node,
                        node_type="function",
                        file_path=node.split(
                            "::"
                        )[0],
                        reason=
                        "No callers found"
                    )
                )

        return findings

    def find_unused_methods(
        self
    ):
        findings = []

        for node, data in (
            self.graph.nodes(data=True)
        ):

            if (
                data.get("type")
                != "method"
            ):
                continue

            incoming = (
                self.graph.in_degree(
                    node
                )
            )

            if incoming == 1:

                findings.append(
                    DeadCodeFinding(
                        node_id=node,
                        node_type="method",
                        file_path=node.split(
                            "::"
                        )[0],
                        reason=
                        "No callers found"
                    )
                )

        return findings

    def analyze(
        self
    ):

        findings = []

        findings.extend(
            self.find_unused_functions()
        )

        findings.extend(
            self.find_unused_methods()
        )

        return findings
