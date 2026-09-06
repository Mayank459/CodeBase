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

            # Mermaid requires the opening brace on the SAME line as `class`.
            # `class User\n{` is a parse error ("Syntax error in text").
            lines.append(
                f"class {cls['name']} {{"
            )

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