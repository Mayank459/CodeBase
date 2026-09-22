"""Professional Security Remediation & Patch Report Generator."""
from typing import List, Optional
from app.security.models import SecurityFinding
from app.security.remediation_models import SecurityPatch

SEVERITY_BADGES = {
    "CRITICAL": "🚨 CRITICAL",
    "HIGH": "⚠️ HIGH",
    "MEDIUM": "🟡 MEDIUM",
    "LOW": "ℹ️ LOW",
}

class RemediationReportGenerator:
    def generate(
        self,
        findings: List[SecurityFinding],
        patches: Optional[List[SecurityPatch]] = None
    ) -> str:
        if not findings:
            return "## ✅ Security Remediation Report\n\nNo security vulnerabilities were identified in the scanned repository. No patches required."

        # Map patches by (file_path, line_number) for precise, non-misaligning lookup
        patch_map = {}
        if patches:
            for patch in patches:
                key = (patch.file_path, patch.line_number)
                patch_map[key] = patch

        lines = [
            "# 🛡️ Security Vulnerability Remediation Report",
            "",
            f"**Total Findings Evaluated**: {len(findings)} | **Automated Patches Ready**: {len(patch_map)}",
            "",
            "---",
            ""
        ]

        for idx, finding in enumerate(findings, start=1):
            badge = SEVERITY_BADGES.get(finding.severity.upper(), "⚠️ " + finding.severity)
            cwe = finding.cwe or "CWE-Unknown"
            patch = patch_map.get((finding.file_path, finding.line_number))

            lines.append(f"### {idx}. [{badge}] `{finding.finding_type}` ({cwe})")
            lines.append(f"- **Location**: `{finding.file_path}:{finding.line_number}`")
            lines.append(f"- **Category**: {finding.category}")
            lines.append(f"- **Description**: {finding.description}")
            lines.append("")

            if patch:
                lines.append(f"**Remediation Guidance**: {patch.explanation}")
                lines.append("")
                lines.append("```diff")
                for orig_line in patch.original_code.splitlines():
                    lines.append(f"- {orig_line}")
                for repl_line in patch.replacement_code.splitlines():
                    lines.append(f"+ {repl_line}")
                lines.append("```")
            else:
                lines.append(f"**Manual Remediation Recommended**: {finding.recommendation}")
                lines.append("```python")
                lines.append(finding.code_snippet)
                lines.append("```")

            lines.append("")
            lines.append("---")
            lines.append("")

        lines.append("### 🚀 Next Steps")
        lines.append("1. Review each proposed patch diff above against your test suite.")
        lines.append("2. Rotate any hardcoded API keys or credentials immediately.")
        lines.append("3. To automatically apply these changes to a Git branch, trigger `POST /agent/chat` with: `\"Please create a pull request to apply security fixes\"`.")

        return "\n".join(lines)
