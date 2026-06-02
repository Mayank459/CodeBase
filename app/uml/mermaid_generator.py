"""Mermaid generator module."""
class MermaidGenerator:

    def generate(
        self,
        classes
    ):

        lines = []

        lines.append(
            "classDiagram"
        )

        lines.append("")

        for cls in classes:

            lines.append(
                f"class {cls['name']}"
            )

            lines.append("{")

            for method in (
                cls["methods"]
            ):

                lines.append(
                    f"  +{method}()"
                )

            lines.append("}")

            lines.append("")

        return "\n".join(
            lines
        )