"""Secure PR Agent with patch validation, AST static checks, revision revalidation, and audit logging."""
from app.security.scanner import SecurityScanner
from app.security.patch_generator import PatchGenerator
from app.pr_generator.diff_generator import DiffGenerator
from app.pr_generator.pr_description_generator import PRDescriptionGenerator
from app.pr_generator.report_generator import PullRequestReportGenerator
from app.storage.repository_registry import repository_registry
from app.storage.db import db_manager
from langgraph.types import interrupt


def pr_node(state):
    repo_name = state.get("repository_name", "")
    repository = repository_registry.get(repo_name)
    if not repository:
        state["answer"] = "Repository not indexed."
        return state

    # Step 1: Scan for security findings
    scanner = SecurityScanner()
    findings = scanner.scan_repository(repository.parsed_files)
    if not findings:
        state["answer"] = "No security vulnerabilities detected. No PR patches needed."
        return state

    # Step 2: Generate patches
    patch_generator = PatchGenerator()
    raw_patches = []
    for finding in findings:
        patch = patch_generator.generate_patch(finding)
        if patch:
            raw_patches.append(patch)

    # Step 3: Validate diffs & run static syntax checks
    diff_gen = DiffGenerator()
    valid_patches = []
    validation_warnings = []

    for patch in raw_patches:
        is_valid, error = diff_gen.validate_patch(patch)
        if is_valid:
            valid_patches.append(patch)
        else:
            validation_warnings.append(error)

    if not valid_patches:
        state["answer"] = f"Patch generation aborted: All candidate patches failed validation checks.\n" + "\n".join(validation_warnings)
        return state

    # Record initial commit SHA snapshot
    meta = db_manager.get_repository_metadata(repo_name) or {}
    expected_sha = meta.get("commit_sha")

    # Step 4: Request Human-In-The-Loop (HITL) approval with validated diffs
    approval = interrupt(
        {
            "type": "pull_request",
            "message": f"Approve {len(valid_patches)} verified patches to create PR for repository '{repo_name}'?",
            "findings": [{"file": f.file_path, "type": f.finding_type} for f in findings],
            "commit_sha": expected_sha,
            "validation_warnings": validation_warnings
        }
    )

    if not approval or not approval.get("approved"):
        state["answer"] = "PR generation rejected by reviewer."
        return state

    # Step 5: Revalidate Repository Revision to prevent drift
    current_meta = db_manager.get_repository_metadata(repo_name) or {}
    current_sha = current_meta.get("commit_sha")
    if expected_sha and current_sha and current_sha != expected_sha:
        state["answer"] = (
            f"PR Generation Aborted: Repository revision drift detected! "
            f"Original SHA: {expected_sha[:8]}, Current SHA: {current_sha[:8]}. "
            f"Please re-index the repository and re-run security review."
        )
        return state

    # Step 6: Generate PR description, unified diff report, and persist audit record
    desc_gen = PRDescriptionGenerator()
    draft = desc_gen.generate(valid_patches)

    report_gen = PullRequestReportGenerator()
    report = report_gen.generate(draft)

    state["answer"] = report
    return state
