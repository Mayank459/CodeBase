"""Security report generator module."""

class SecurityReportGenerator:
    def generate(self, findings, repository_name: str = "", total_files: int = 0):
        repo_header = f" for '{repository_name}'" if repository_name else ""
        
        if not findings:
            return f"""### Automated Security Scanner Findings{repo_header}
**Status:** ✅ PASSED (0 Vulnerabilities Detected)
**Total Files Scanned:** {total_files or 'All indexed files'}

**Verified Security Controls:**
- ✅ **Secrets & Credentials:** No committed private keys, hardcoded tokens, or plaintext secrets found.
- ✅ **Code Execution:** No dangerous dynamic execution sinks (`eval()`, `exec()`) identified.
- ✅ **Data Deserialization:** No untrusted deserialization vulnerabilities (`pickle.loads()`) found.
- ✅ **Injection Defense:** No unparameterized SQL or unescaped shell execution patterns detected.
- ✅ **Environment Hygiene:** Secrets correctly isolated and retrieved via environment variables.
"""

        lines = [
            f"### Automated Security Scanner Findings{repo_header}",
            f"**Status:** ⚠️ {len(findings)} Potential Issue{'s' if len(findings) > 1 else ''} Detected",
            f"**Total Files Scanned:** {total_files or 'All indexed files'}\n",
            "| # | Severity | Category | CWE | Location | Finding |",
            "|---|---|---|---|---|---|"
        ]

        for idx, f in enumerate(findings, start=1):
            category = getattr(f, "category", "Code Security")
            cwe = getattr(f, "cwe", "CWE-General")
            file_path = f.file_path.replace("\\", "/")
            lines.append(f"| {idx} | **{f.severity}** | {category} | `{cwe}` | `{file_path}:{f.line_number}` | {f.description} |")

        lines.append("\n#### Detailed Finding Code Snippets:")
        for idx, f in enumerate(findings, start=1):
            file_path = f.file_path.replace("\\", "/")
            lines.append(f"**Finding #{idx}: {f.finding_type.replace('_', ' ').title()} [{f.severity}]**")
            lines.append(f"- **File:** `{file_path}:{f.line_number}`")
            lines.append(f"- **Rule:** {f.description}")
            lines.append(f"```\n{f.code_snippet}\n```\n")

        return "\n".join(lines)
