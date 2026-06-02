"""Security agent module."""
from app.storage.repository_registry import repository_registry
from app.security.scanner import SecurityScanner
from app.security.report_generator import SecurityReportGenerator
from app.chat.llm_provider import LLMProvider

def security_node(state):
    repository = repository_registry.get(state["repository_name"])

    if not repository:
        state["answer"] = "Repository not indexed. Please index it first."
        return state

    scanner = SecurityScanner()
    findings = scanner.scan_repository(repository.parsed_files)

    formatter = SecurityReportGenerator()
    report = formatter.generate(findings)

    llm = LLMProvider()
    
    prompt = f"""
You are a Senior Security Auditor evaluating a repository codebase.

Analyze the following automated security scanner findings. Explain the risks associated with these specific findings in a highly professional, easy-to-read manner. If no vulnerabilities were found, confirm that the codebase passed the automated checks.

{report}
"""

    state["answer"] = llm.generate(prompt)

    return state
