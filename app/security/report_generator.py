"""Security report generator module."""

class SecurityReportGenerator:
    def generate(self, findings):
        if not findings:
            return "No security issues found. The codebase appears safe from the defined risk patterns."

        lines = [f"Found {len(findings)} potential security issues:\n"]

        for idx, finding in enumerate(findings, start=1):
            file_name = finding.file_path.replace("\\", "/").split("/")[-1]
            lines.append(f"{idx}. {finding.finding_type}")
            lines.append(f"   Location: {file_name}:{finding.line_number}")
            lines.append(f"   Severity: {finding.severity}")
            lines.append(f"   Snippet: `{finding.code_snippet}`\n")

        return "\n".join(lines)
