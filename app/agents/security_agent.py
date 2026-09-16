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
        prompt = f"""
You are a Principal Security Architect performing an official security evaluation of the '{repository.repository_name}' repository.

The automated static scanner evaluated {total_files} source files and detected 0 security vulnerabilities or exposed credentials.

Write a clean, professional, executive-grade Security Audit Report using the following clear sections:
1. **Executive Summary**:
   - Status: **PASSED (Grade A+)**
   - Security Health Score: **100 / 100**
   - Repository: `{repository.repository_name}` ({total_files} files evaluated)
   - Summary: State clearly that the codebase successfully passed all security vulnerability checks with zero detected risks.
2. **Verified Security Controls & Hygiene**:
   - Highlight positive security patterns observed in the codebase (e.g. environment variable encapsulation via process.env / import.meta.env, absence of dangerous evaluation sinks, clean module separation).
3. **Security Control Matrix**:
   - Provide a markdown table showing all tested vulnerability domains (Hardcoded Secrets & API Keys, Remote Code Execution, SQL Injection, Shell Command Injection, Insecure Deserialization, Cryptographic Flaws) with Status: `✅ PASSED`.
4. **Hardening Recommendations for Production**:
   - 2-3 proactive best practice tips for production readiness (e.g. CI/CD secret scanning in GitHub Actions, branch protection rules, automated dependency vulnerability alerts).

Scanner Telemetry:
{report}
"""
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
