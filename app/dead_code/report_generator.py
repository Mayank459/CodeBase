"""Dead code report generator."""
class DeadCodeReportGenerator:

    def generate(
        self,
        findings
    ):

        if not findings:

            return (
                "No dead code found."
            )

        lines = []

        lines.append(
            "# Dead Code Report\n"
        )

        for finding in findings:

            lines.append(
                f"- {finding.node_type}"
            )

            lines.append(
                f"  {finding.node_id}"
            )

            lines.append(
                f"  {finding.reason}"
            )

            lines.append("")
            
        return "\n".join(
            lines
        )