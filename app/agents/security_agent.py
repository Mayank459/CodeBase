"""Security agent module."""
from app.storage.repository_registry import repository_registry
from app.security.scanner import SecurityScanner
from app.security.report_generator import SecurityReportGenerator
from app.chat.llm_provider import LLMProvider

def security_node(state):
    repo_name = state.get("repository_name", "")
    repository = repository_registry.get(repo_name)

    if not repository:
        state["answer"] = f"⚠️ Repository '{repo_name}' is not currently indexed. Please index it first using the repository ingestion drawer."
        return state

    scanner = SecurityScanner()
    findings = scanner.scan_repository(repository.parsed_files)

    total_files = len(repository.parsed_files)
    formatter = SecurityReportGenerator()
    report = formatter.generate(
        findings, 
        repository_name=repository.repository_name,
        total_files=total_files
    )

    llm = LLMProvider()
    
    if not findings:
        # State what was checked and nothing more. The old prompt hard-coded
        # "PASSED (Grade A+), 100/100" and asked the model to praise security
        # patterns it had never seen; a pattern scan cannot prove code is secure.
        from app.security.patterns import SECURITY_RULES
        categories = sorted({r.get("category", "") for r in SECURITY_RULES if r.get("category")})
        state["answer"] = (
            f"# Security scan: {repository.repository_name}\n\n"
            f"No matches for the scanner's {len(SECURITY_RULES)} rules across {total_files} files.\n\n"
            f"**Rules checked:** {', '.join(categories)}.\n\n"
            "This is a static pattern scan of source text. It finds known risky constructs such as "
            "hard-coded secrets, `eval`/`exec`, shell calls and string-built SQL. It does not check "
            "dependency CVEs, authentication logic or data flow, so no findings is not proof the code is secure."
        )
        return state

    else:
        prompt = f"""
You are a Principal Security Architect performing an official security evaluation of the '{repository.repository_name}' repository.

The automated static scanner identified {len(findings)} potential security issues across {total_files} files in '{repository.repository_name}'.

Write a structured, actionable Security Audit Report using the following format:
1. **Executive Summary**:
   - Status: **ACTION REQUIRED**
   - Repository: `{repository.repository_name}` ({total_files} files evaluated)
   - Summary of the primary risk areas detected.
2. **Vulnerability Breakdown**:
   - Detail each vulnerability with:
     - Finding Title and Severity badge (CRITICAL / HIGH / MEDIUM / LOW)
     - CWE Identifier and exact location (`file_path:line_number`)
     - Risk analysis explaining the real-world exploit scenario
     - Concrete Code Remediation (provide exact before and after code snippet)
3. **Hardening Roadmap**:
   - Prioritized list of steps the development team should take to mitigate the issues.

Automated Scanner Findings:
{report}
"""

    state["answer"] = llm.generate(prompt)
    return state
