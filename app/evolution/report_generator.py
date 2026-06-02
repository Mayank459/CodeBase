class EvolutionReportGenerator:
    def generate(self, report):
        lines = []

        lines.append("# Repository Evolution\n")

        lines.append("Added Classes:")
        for item in report.added_classes:
            lines.append(f"- {item}")
        lines.append("")

        lines.append("Removed Classes:")
        for item in report.removed_classes:
            lines.append(f"- {item}")
        lines.append("")

        lines.append("Added Functions:")
        for item in report.added_functions:
            lines.append(f"- {item}")
        lines.append("")

        lines.append("Added Files:")
        for item in report.added_files:
            lines.append(f"- {item}")

        return "\n".join(lines)
