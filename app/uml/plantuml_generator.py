"""PlantUML generator module."""

class PlantUMLGenerator:

    def generate(
        self,
        classes
    ):

        lines = []

        lines.append(
            "@startuml"
        )

        lines.append("")

        for cls in classes:

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

        lines.append(
            "@enduml"
        )

        return "\n".join(
            lines
        )
