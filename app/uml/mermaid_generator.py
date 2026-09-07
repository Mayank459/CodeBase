"""Mermaid generator module."""
class MermaidGenerator:

    def generate(self, classes):

        lines = []

        lines.append(
            "classDiagram"
        )

        lines.append("")

        for cls in classes:

            methods = cls["methods"]

            if not methods:
                # A class with no members must be declared WITHOUT a body:
                # `class X {` + `}` renders as `class X {}` which is a parse
                # error in mermaid 10.2.4 ("Expecting 'MEMBER', got
                # 'STRUCT_STOP'"). A bare `class X` decl is valid.
                lines.append(
                    f"class {cls['name']}"
                )
                lines.append("")

                continue

            # Mermaid requires the opening brace on the SAME line as `class`.
            # `class User\n{` is a parse error ("Syntax error in text").
            lines.append(
                f"class {cls['name']} {{"
            )

            for method in methods:

                lines.append(
                    f"  +{method}()"
                )

            lines.append("}")

            lines.append("")

        return "\n".join(
            lines
        )