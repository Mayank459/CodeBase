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

    formatter = SecurityReportGenerator()
    report = formatter.generate(findings, repository_name=repository.repository_name)

    llm = LLMProvider()
    
    prompt = f"""
You are a Senior Security Auditor evaluating the '{repository.repository_name}' codebase.

Analyze the following automated security scanner findings specifically for '{repository.repository_name}'. Explain the risks associated with these specific findings in a highly professional, easy-to-read manner. Categorize issues by severity (CRITICAL, HIGH, MEDIUM, LOW) and reference the exact file paths and line numbers provided in the report. If no vulnerabilities were found, confirm that '{repository.repository_name}' passed the automated checks.

Repository Name: {repository.repository_name}
Automated Scanner Findings:
{report}
"""

    state["answer"] = llm.generate(prompt)

    return state
