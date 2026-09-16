from app.security.scanner import SecurityScanner
from app.security.patch_generator import PatchGenerator
from app.security.remediation_report import RemediationReportGenerator
from app.storage.repository_registry import repository_registry


def security_fix_node(state):
    repo_name = state.get("repository_name", "")
    repository = repository_registry.get(repo_name)

    if repository is None:
        state["answer"] = f"⚠️ Repository '{repo_name}' is not currently indexed. Please index it first using the repository ingestion drawer."
        return state

    scanner = SecurityScanner()
    findings = scanner.scan_repository(repository.parsed_files)

    if not findings:
        state["answer"] = f"✅ No security vulnerabilities found in '{repository.repository_name}'!"
        return state

    patch_generator = PatchGenerator()
    patches = []
    for finding in findings:
        patch = patch_generator.generate_patch(finding)
        if patch:
            patches.append(patch)

    report_generator = RemediationReportGenerator()
    raw_report = report_generator.generate(findings, patches)

    state["answer"] = raw_report
    return state
