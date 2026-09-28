"""PR agent: real diffs, human approval (LangGraph interrupt), then a patch
and pull-request text built only from the fixes the reviewer selected."""
from app.security.scanner import SecurityScanner
from app.pr_generator.patch_builder import build_changes, pull_request_text
from app.storage.repository_registry import repository_registry
from app.storage.db import db_manager
from langgraph.types import interrupt


def pr_node(state):
    repo_name = state.get("repository_name", "")
    repository = repository_registry.get(repo_name)
    if not repository:
        state["answer"] = "Repository not indexed."
        return state

    findings = SecurityScanner().scan_repository(repository.parsed_files)
    if not findings:
        state["answer"] = "The security scan found nothing to fix, so there is no patch to review."
        state["pr"] = {"files": [], "manual": []}
        return state

    files, manual = build_changes(repository, findings)
    if not files:
        state["answer"] = (
            f"{len(manual)} finding{'s' if len(manual) != 1 else ''} found, but none has a safe automatic fix. "
            "They need a manual change:\n\n" + "\n".join(f"- `{m['file']}:{m['line']}` {m['rule']}: {m['reason']}" for m in manual)
        )
        state["pr"] = {"files": [], "manual": manual}
        return state

    meta = db_manager.get_repository_metadata(repo_name) or {}
    expected_sha = meta.get("commit_sha")

    # Human-in-the-loop: the reviewer sees every diff and picks which fixes to keep
    approval = interrupt({
        "type": "pull_request",
        "repository": repository.repository_name,
        "message": f"Review {sum(len(f['changes']) for f in files)} fixes in {len(files)} files for '{repository.repository_name}'.",
        "commit_sha": expected_sha,
        "files": files,
        "manual": manual,
        "findings": [{"file": f.file_path, "line": f.line_number, "type": f.finding_type, "severity": f.severity} for f in findings],
    })

    if not approval or not approval.get("approved"):
        state["answer"] = "Rejected by the reviewer. No patch was produced."
        state["pr"] = {"files": [], "manual": manual, "rejected": True}
        return state

    current_sha = (db_manager.get_repository_metadata(repo_name) or {}).get("commit_sha")
    if expected_sha and current_sha and current_sha != expected_sha:
        state["answer"] = (
            f"Stopped: the repository changed since the review (was {expected_sha[:8]}, now {current_sha[:8]}). "
            "Re-index it and review the fixes again."
        )
        return state

    selected = approval.get("selected")
    if selected is not None:
        files, manual = build_changes(repository, findings, only_ids=set(selected))
    if not files:
        state["answer"] = "No fixes were selected, so no patch was produced."
        state["pr"] = {"files": [], "manual": manual}
        return state

    pr = pull_request_text(repository.repository_name, files, manual)
    state["pr"] = {**pr, "diffs": files, "manual": manual}
    state["answer"] = f"# {pr['title']}\n\n{pr['body']}"
    return state
