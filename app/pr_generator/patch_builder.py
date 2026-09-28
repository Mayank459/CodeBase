"""Turn security findings into reviewable, git-apply-ready changes.

The old flow showed the reviewer a list of findings (no diffs), then produced
"-"/"+" pairs of the flagged line under a fake "@@ -1" header and a template
description ("Security Hardening / Fixed detected vulnerabilities"). This edits
the real file: one line per finding, the import the fix needs, a parse check
of the whole patched file, and a proper unified diff with context.
"""
import ast
import difflib
import re
from collections import defaultdict

from app.security.patch_generator import PatchGenerator

# Module a replacement starts to need, by the call it introduces
_IMPORTS = {"ast.literal_eval": "ast", "os.getenv": "os", "json.loads": "json", "hashlib.sha256": "hashlib"}


def finding_id(f):
    return f"{f.file_path}:{f.line_number}:{f.finding_type}"


def _has_import(src, module):
    return re.search(rf"^\s*(import\s+{module}\b|from\s+{module}\s+import\b)", src, re.M) is not None


def _insert_import(lines, module):
    """Insert `import module` after the last top-level import (or the docstring)."""
    at = 0
    in_doc = False
    for i, line in enumerate(lines):
        s = line.strip()
        if i == at and (s.startswith('"""') or s.startswith("'''")):
            in_doc = not (s.count('"""') >= 2 or s.count("'''") >= 2)
            at = i + 1
            continue
        if in_doc:
            if '"""' in s or "'''" in s:
                in_doc = False
            at = i + 1
            continue
        if re.match(r"(import|from)\s+\w", line):
            at = i + 1
    lines.insert(at, f"import {module}\n")


def _unsafe_rewrite(rule, line):
    """Why the rule's mechanical rewrite would change behaviour on this line (or None)."""
    if rule == "dangerous_exec":
        return "exec runs arbitrary code and has no drop-in safe replacement; restructure it by hand."
    if rule != "dangerous_eval":
        return None
    try:
        tree = ast.parse(line.strip())
    except SyntaxError:
        return "The eval call spans several lines; review it by hand."
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "eval":
            arg = node.args[0] if node.args else None
            if len(node.args) != 1 or node.keywords:
                return "eval is given globals/locals, so ast.literal_eval cannot replace it."
            if isinstance(arg, ast.Call) and getattr(arg.func, "id", "") == "compile":
                return "eval runs compiled code here; ast.literal_eval only reads literals."
    return None


def build_changes(repository_index, findings, only_ids=None):
    """(files, manual): per-file diffs of automatic fixes, and findings that
    need a person because no safe single-line edit exists."""
    sources = {pf.file_path.replace("\\", "/"): (pf.source_code or "") for pf in repository_index.parsed_files}
    generator = PatchGenerator()
    per_file = defaultdict(list)
    manual = []

    for f in findings:
        fid = finding_id(f)
        if only_ids is not None and fid not in only_ids:
            continue
        entry = {"id": fid, "file": f.file_path, "line": f.line_number, "rule": f.finding_type,
                 "severity": f.severity, "description": f.description}
        src = sources.get(f.file_path)
        patch = generator.generate_patch(f)
        if not src or not patch:
            manual.append({**entry, "reason": "No automatic fix exists for this rule."})
            continue
        lines = src.splitlines(keepends=True)
        if not (0 < f.line_number <= len(lines)):
            manual.append({**entry, "reason": "The flagged line is outside the indexed file; re-index and scan again."})
            continue
        old_line = lines[f.line_number - 1]
        orig, repl = patch.original_code, patch.replacement_code
        unsafe = _unsafe_rewrite(f.finding_type, old_line)
        if unsafe:
            manual.append({**entry, "reason": unsafe})
            continue
        if not orig or orig not in old_line or not repl or repl == orig or "\n" in repl.strip():
            manual.append({**entry, "reason": "The suggested fix is a template, not a safe edit of this exact line."})
            continue
        per_file[f.file_path].append({**entry, "old": old_line.rstrip("\n"), "new": old_line.replace(orig, repl, 1).rstrip("\n"),
                                      "explanation": patch.explanation})

    files = []
    for path, changes in sorted(per_file.items()):
        src = sources[path]
        lines = src.splitlines(keepends=True)
        applied, seen_lines = [], set()
        for ch in sorted(changes, key=lambda c: c["line"]):
            if ch["line"] in seen_lines:
                manual.append({**{k: ch[k] for k in ("id", "file", "line", "rule", "severity", "description")},
                               "reason": "Another fix already changes this line."})
                continue
            seen_lines.add(ch["line"])
            ending = "\n" if lines[ch["line"] - 1].endswith("\n") else ""
            lines[ch["line"] - 1] = ch["new"] + ending
            applied.append(ch)
        added_imports = []
        new_text = "".join(lines)
        for call, module in _IMPORTS.items():
            if any(call in c["new"] for c in applied) and not _has_import(src, module) and module not in added_imports:
                added_imports.append(module)
        for module in added_imports:
            _insert_import(lines, module)
        new_text = "".join(lines)

        if path.endswith(".py"):
            try:
                ast.parse(new_text)
            except SyntaxError as e:
                for ch in applied:
                    manual.append({**{k: ch[k] for k in ("id", "file", "line", "rule", "severity", "description")},
                                   "reason": f"The fixed file would not parse ({e.msg}, line {e.lineno})."})
                continue

        diff = "".join(difflib.unified_diff(src.splitlines(True), new_text.splitlines(True),
                                            fromfile=f"a/{path}", tofile=f"b/{path}", n=3))
        if not diff.endswith("\n"):
            diff += "\n"
        files.append({"path": path, "diff": diff, "changes": applied, "imports_added": added_imports})
    return files, manual


def pull_request_text(repository_name, files, manual, reviewer_note=""):
    """Title, Markdown body and the combined patch for the approved changes."""
    changes = [c for f in files for c in f["changes"]]
    rules = sorted({c["rule"].replace("_", " ") for c in changes})
    n = len(changes)
    title = f"Fix {n} security finding{'s' if n != 1 else ''} in {repository_name}" + (f": {', '.join(rules[:3])}" if rules else "")
    body = [
        "## Summary",
        "",
        f"Automated remediation of {n} static-analysis finding{'s' if n != 1 else ''} across {len(files)} file{'s' if len(files) != 1 else ''}, "
        "reviewed and approved in CodeBase before this patch was produced.",
        "",
        "## Changes",
        "",
        "| File | Line | Rule | Severity | Now reads |",
        "| --- | --- | --- | --- | --- |",
    ]
    why = {}
    for f in files:
        for c in f["changes"]:
            new = c["new"].strip().replace("|", "\\|")
            new = new if len(new) <= 70 else new[:67] + "…"
            body.append(f"| `{f['path']}` | {c['line']} | {c['rule']} | {c['severity'].lower()} | `{new}` |")
            why.setdefault(c["rule"], c["explanation"])
        if f["imports_added"]:
            body.append(f"| `{f['path']}` | top | — | — | `import {', '.join(f['imports_added'])}` |")
    if why:
        body += ["", "**Why:**", ""] + [f"- **{rule}**: {text}" for rule, text in why.items()]
    if manual:
        body += ["", "## Needs manual attention", ""]
        body += [f"- `{m['file']}:{m['line']}` {m['rule']} ({m['severity'].lower()}): {m['reason']}" for m in manual]
    body += [
        "",
        "## Checks",
        "",
        "- Each patched Python file parses as valid Python.",
        "- Only the flagged lines change, plus any import a fix needs.",
        "- Behaviour may change where a fix swaps an API (for example `pickle.loads` → `json.loads`); run the test suite.",
        "",
        "## Apply",
        "",
        "```bash",
        "git checkout -b codebase/security-fixes",
        "git apply codebase-security-fixes.patch",
        "git commit -am \"" + title.replace('"', "'") + "\"",
        "```",
    ]
    if reviewer_note:
        body += ["", reviewer_note]
    patch = "".join(f["diff"] for f in files)
    return {"title": title, "body": "\n".join(body), "patch": patch, "files": [f["path"] for f in files]}
