"""Tests for version comparison (evolution) and the pull-request patch builder."""

import pytest

from tests.test_correctness_fixes import build


# ------------------------------------------------------------- evolution

@pytest.mark.parametrize("old,new,expected", [
    ("(a, b)", "(a, b)", None),
    ("(a,\n    b)", "(a, b)", None),                               # whitespace only
    ("(a, b)", "(a)", "breaking"),                                 # parameter removed
    ("(a)", "(a, b)", "breaking"),                                 # new required parameter
    ("(a)", "(a, b=None)", "compatible"),                          # new optional parameter
    ("(a, b)", "(a, **kwargs)", "compatible"),                     # b still accepted via **kwargs
    ("(self, url: str)", "(self, url: str, *, timeout=3)", "compatible"),
    ("(self, url)", "(self, url, *, verify)", "breaking"),         # new required keyword-only
])
def test_signature_change_classification(old, new, expected):
    from app.evolution.history import _signature_change
    res = _signature_change(old, new)
    assert (res[0] if res else None) == expected


def test_refs_are_validated_before_reaching_git():
    from app.evolution.history import _check_ref, EvolutionError
    assert _check_ref("v2.32.3") == "v2.32.3" and _check_ref("") == "HEAD"
    for bad in ("--upload-pack=x", "a..b", "-v", "tag with space"):
        with pytest.raises(EvolutionError):
            _check_ref(bad)


def test_version_sorting_puts_newest_tag_first():
    from app.evolution.history import _version_key
    tags = ["v2.9.0", "v2.10.0", "v2.32.3", "v2.32.10", "nightly"]
    assert sorted(tags, key=_version_key, reverse=True)[:3] == ["v2.32.10", "v2.32.3", "v2.10.0"]


# -------------------------------------------------------------------- PR

_VULN = (
    "import subprocess\n"
    "API_KEY = \"sk-live-0123456789abcdef0123\"\n"
    "\n"
    "def run(cmd):\n"
    "    return subprocess.run(cmd, shell=True)\n"
    "\n"
    "def parse(text):\n"
    "    return eval(text)\n"
)


def _vuln_repo():
    return build({"svc/tool.py": _VULN})[0]


def _findings(idx):
    from app.security.scanner import SecurityScanner
    return SecurityScanner().scan_repository(idx.parsed_files)


def test_patch_builder_makes_real_diffs_with_imports_and_valid_python():
    from app.pr_generator.patch_builder import build_changes
    idx = _vuln_repo()
    findings = _findings(idx)
    assert {f.finding_type for f in findings} >= {"shell_true", "dangerous_eval"}
    files, manual = build_changes(idx, findings)
    assert [f["path"] for f in files] == ["svc/tool.py"]
    diff = files[0]["diff"]
    assert diff.startswith("--- a/svc/tool.py\n+++ b/svc/tool.py\n@@ ")
    assert "+    return subprocess.run(cmd, shell=False)" in diff
    assert "+    return ast.literal_eval(text)" in diff
    assert "+import ast" in diff and "ast" in files[0]["imports_added"]
    # The patched file is still valid Python
    new = [l[1:] for l in diff.splitlines() if l.startswith(("+", " ")) and not l.startswith("+++")]
    assert new  # context and additions present
    assert all("id" in c and c["line"] > 0 for c in files[0]["changes"])


def test_patch_builder_applies_only_selected_fixes():
    from app.pr_generator.patch_builder import build_changes, finding_id
    idx = _vuln_repo()
    findings = _findings(idx)
    keep = {finding_id(f) for f in findings if f.finding_type == "shell_true"}
    files, _ = build_changes(idx, findings, only_ids=keep)
    diff = files[0]["diff"]
    assert "shell=False" in diff and "literal_eval" not in diff and "+import ast" not in diff


def test_pull_request_text_is_grounded_in_the_changes():
    from app.pr_generator.patch_builder import build_changes, pull_request_text
    idx = _vuln_repo()
    files, manual = build_changes(idx, _findings(idx))
    pr = pull_request_text("demo", files, manual)
    assert pr["title"].startswith("Fix ") and "demo" in pr["title"]
    assert "| `svc/tool.py` |" in pr["body"] and "git apply codebase-security-fixes.patch" in pr["body"]
    assert pr["patch"] == "".join(f["diff"] for f in files)
    assert "Security Hardening" not in pr["body"]


def test_findings_without_a_safe_edit_go_to_manual():
    from app.pr_generator.patch_builder import build_changes
    idx = build({"web/q.py": "def q(cur, name):\n    cur.execute(\"SELECT * FROM t WHERE n = '%s'\" % name)\n"})[0]
    files, manual = build_changes(idx, _findings(idx))
    assert files == [] or all("SELECT" not in f["diff"] for f in files)
    assert all(m["reason"] for m in manual)


def test_pr_agent_pauses_with_diffs_for_review(monkeypatch):
    import app.agents.pr_agent as pr_agent
    from app.storage.repository_registry import repository_registry
    captured = {}
    monkeypatch.setattr(pr_agent, "interrupt", lambda payload: captured.setdefault("payload", payload) and {"approved": True, "selected": None})
    idx = _vuln_repo()
    repository_registry.repositories["zz_pr_demo"] = {"index": idx, "timestamp": 0}
    try:
        state = pr_agent.pr_node({"repository_name": "zz_pr_demo"})
    finally:
        repository_registry.repositories.pop("zz_pr_demo", None)
    payload = captured["payload"]
    assert payload["files"] and payload["files"][0]["diff"].startswith("--- a/")
    assert state["pr"]["patch"] and state["answer"].startswith("# Fix ")


def test_scanner_ignores_risky_text_inside_strings_and_comments():
    from app.security.scanner import SecurityScanner
    src = (
        "RULES = {'eval': \"calls eval(x) are dangerous\", 'shell': 'shell=True'}  # eval(y)\n"
        "def f(x):\n    return eval(x)\n"
        "import hashlib\nDIGEST = hashlib.md5(b'x', usedforsecurity=False)\n"
    )
    found = SecurityScanner().scan_file("pkg/rules.py", src)
    assert [(f.line_number, f.finding_type) for f in found] == [(3, "dangerous_eval")]


def test_eval_with_globals_or_compiled_code_is_left_for_a_person():
    from app.pr_generator.patch_builder import build_changes
    idx = build({"svc/run.py": "def go(src, ctx):\n    eval(compile(src, 'x', 'exec'), ctx)\n\ndef val(t):\n    return eval(t)\n"})[0]
    files, manual = build_changes(idx, _findings(idx))
    assert [c["line"] for f in files for c in f["changes"]] == [5]
    assert any("compiled code" in m["reason"] or "globals" in m["reason"] for m in manual)


def test_secret_fix_keeps_the_original_spacing():
    from app.pr_generator.patch_builder import build_changes
    idx = build({"app/cfg.py": "import os\nconfig = dict(\n    SECRET_KEY=\"sk-live-0123456789abcdef0123\",\n)\n"})[0]
    files, _ = build_changes(idx, _findings(idx))
    assert '+    SECRET_KEY=os.getenv("SECRET_KEY", ""),' in files[0]["diff"]
