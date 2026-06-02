from app.security.scanner import SecurityScanner
from app.security.patch_generator import PatchGenerator
from app.pr_generator.diff_generator import DiffGenerator
from app.pr_generator.pr_description_generator import PRDescriptionGenerator
from app.pr_generator.report_generator import PullRequestReportGenerator
from app.storage.repository_registry import repository_registry
from langgraph.types import interrupt

def pr_node(state):
    repository = repository_registry.get(state["repository_name"])
    if not repository:
        state["answer"] = "Repository not indexed."
        return state

    scanner = SecurityScanner()
    findings = scanner.scan_repository(repository.parsed_files)
    
    patch_generator = PatchGenerator()
    patches = []
    for finding in findings:
        patch = patch_generator.generate_patch(finding)
        if patch:
            patches.append(patch)
            
    approval = interrupt(
        {
            "type": "pull_request",
            "message": "Approve patches to generate PR?",
            "findings": [{"file": f.file_path, "type": f.finding_type} for f in findings]
        }
    )

    if not approval or not approval.get("approved"):
        state["answer"] = "PR generation rejected."
        return state
        
    desc_gen = PRDescriptionGenerator()
    draft = desc_gen.generate(patches)
    
    report_gen = PullRequestReportGenerator()
    report = report_gen.generate(draft)
    
    state["answer"] = report
    return state
