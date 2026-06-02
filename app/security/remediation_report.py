class RemediationReportGenerator:

    def generate(
        self,
        findings,
        patches
    ):
        lines = []

        lines.append(
            "# Security Remediation Report\n"
        )

        for finding, patch in zip(
            findings,
            patches
        ):
            lines.append(
                f"Issue: {finding.finding_type}"
            )
            lines.append(
                f"File: {finding.file_path}"
            )
            lines.append(
                f"Line: {finding.line_number}"
            )
            lines.append(
                f"Code: {finding.code_snippet}"
            )
            lines.append(
                f"Fix: {patch.explanation}"
            )
            lines.append(
                "Suggested Replacement:"
            )
            lines.append(
                patch.replacement_code
            )
            lines.append(
                "-" * 60
            )

        return "\n".join(lines)
