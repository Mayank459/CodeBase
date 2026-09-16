"""Security report generator module."""

class SecurityReportGenerator:
    def generate(self, findings, repository_name: str = ""):
        repo_header = f" for '{repository_name}'" if repository_name else ""
        if not findings:
            return f"No security issues found{repo_header}. The codebase passed all automated security risk checks."

        lines = [f"Security Audit Report{repo_header}:\nFound {len(findings)} potential security issues across the codebase:\n"]

        for idx, finding in enumerate(findings, start=1):
            file_path = finding.file_path.replace("\\", "/")
            lines.append(f"{idx}. **{finding.finding_type.replace('_', ' ').title()}** [{finding.severity}]")
            lines.append(f"   Location: `{file_path}:{finding.line_number}`")
            lines.append(f"   Severity: {finding.severity}")
            lines.append(f"   Pattern: `{finding.description}`")
            lines.append(f"   Snippet: `{finding.code_snippet}`\n")

        return "\n".join(lines)
