"""Compare two versions (tags or branches) of one repository.

The old evolution tool diffed two separately indexed repositories by class and
function names only, and since the registry keys repositories by name it could
never hold two versions of the same one. This works from git directly: shallow
checkouts of both refs, a structural diff of their public API, per-file churn,
dependency changes, and the commits in between.
"""
import ast
import difflib
import re
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

from app.indexing.repository_loader import normalize_repo_url, remove_tree
from app.parsers.python.extractor import extract_python_file

_REF_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/\-]{0,120}$")
_STDLIB = set(getattr(sys, "stdlib_module_names", ())) | {"__future__"}
_GIT_TIMEOUT = 120


class EvolutionError(ValueError):
    pass


def _git(args, cwd=None, timeout=_GIT_TIMEOUT):
    import os
    res = subprocess.run(
        ["git", *args], cwd=cwd, capture_output=True, text=True, timeout=timeout,
        env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
    )
    if res.returncode != 0:
        raise EvolutionError((res.stderr or res.stdout).strip().splitlines()[-1] if (res.stderr or res.stdout) else "git failed")
    return res.stdout


def _check_ref(ref):
    if ref in ("", "HEAD"):
        return "HEAD"
    if not _REF_RE.match(ref) or ".." in ref:
        raise EvolutionError(f"Not a valid tag or branch name: '{ref}'")
    return ref


def _version_key(tag):
    nums = [int(n) for n in re.findall(r"\d+", tag)]
    return (bool(nums), nums, tag)


def list_refs(repo_url, limit=40):
    """Tags (newest version first) and branches, without cloning."""
    url = normalize_repo_url(repo_url)
    out = _git(["ls-remote", "--tags", "--heads", url], timeout=60)
    default = None
    try:  # --heads filters out HEAD itself, so ask for the symbolic ref separately
        head = _git(["ls-remote", "--symref", url, "HEAD"], timeout=30)
        first = head.splitlines()[0] if head else ""
        if first.startswith("ref: "):
            default = first.split()[1].removeprefix("refs/heads/")
    except EvolutionError:
        pass
    tags, branches = [], []
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) != 2:
            continue
        ref = parts[1]
        if ref.startswith("refs/tags/") and not ref.endswith("^{}"):
            tags.append(ref.removeprefix("refs/tags/"))
        elif ref.startswith("refs/heads/"):
            branches.append(ref.removeprefix("refs/heads/"))
    tags.sort(key=_version_key, reverse=True)
    return {"url": url, "default_branch": default, "tags": tags[:limit], "branches": sorted(branches)[:limit]}


# ------------------------------------------------------------------ parsing

def _is_source(rel):
    parts = rel.split("/")
    return (
        rel.endswith(".py")
        and not any(p in ("tests", "test", "docs", "doc", "examples") for p in parts[:-1])
        and not parts[-1].startswith("test_")
        and parts[-1] not in ("conftest.py", "setup.py", "conf.py")
    )


def _module(rel):
    parts = rel[:-3].split("/")
    if parts and parts[0] in ("src", "lib"):
        parts = parts[1:]
    if parts and parts[-1] == "__init__":
        parts = parts[:-1]
    return ".".join(parts)


def _snapshot(root):
    """{rel_path: source} for source files, plus public API and imports."""
    root = Path(root)
    files, api, imports = {}, {}, set()
    # Not the indexing scanner: its 100 KB cap would make a large file (e.g.
    # requests' tests/test_requests.py) look "removed" in whichever version exceeds it.
    for path in sorted(root.rglob("*.py")):
        rel = path.relative_to(root).as_posix()
        if any(part.startswith(".") or part in ("node_modules", "venv", ".venv", "build", "dist") for part in rel.split("/")[:-1]):
            continue
        if path.stat().st_size > 2_000_000:
            continue
        try:
            src = path.read_text(encoding="utf8", errors="ignore")
        except OSError:
            continue
        files[rel] = src
        if not _is_source(rel):
            continue
        pf = extract_python_file(rel, src)
        mod = _module(rel)
        for imp in pf.imports:
            top = str(imp.module).split(",")[0].split(" as ")[0].strip()
            if top and not top.startswith("."):
                imports.add(top.split(".")[0])
        for f in pf.functions:
            if not f.name.startswith("_"):
                api[f"{mod}.{f.name}"] = {"kind": "function", "signature": f.signature, "file": rel, "line": f.start_line}
        for c in pf.classes:
            if c.name.startswith("_"):
                continue
            api[f"{mod}.{c.name}"] = {"kind": "class", "signature": "", "file": rel, "line": c.start_line, "bases": list(c.bases or [])}
            for m in c.methods:
                if not m.name.startswith("_") or m.name == "__init__":
                    api[f"{mod}.{c.name}.{m.name}"] = {"kind": "method", "signature": m.signature, "file": rel, "line": m.start_line}
    own = {_module(r).split(".")[0] for r in files if r.endswith("__init__.py")}
    deps = {i for i in imports if i not in _STDLIB and i not in own and i}
    return files, api, deps


def _params(signature):
    """(all parameter names, required names, accepts **kwargs) from '(a, b=1, *, c)'."""
    try:
        one_line = re.sub(r"\s+", " ", signature or "()")
        fn = ast.parse(f"def f{one_line}: pass").body[0]
    except SyntaxError:
        return None
    a = fn.args
    positional = [x.arg for x in a.posonlyargs + a.args if x.arg not in ("self", "cls")]
    n_def = len(a.defaults)
    required = positional[: len(positional) - n_def] if n_def else positional
    required += [x.arg for x, d in zip(a.kwonlyargs, a.kw_defaults) if d is None]
    names = positional + [x.arg for x in a.kwonlyargs]
    return set(names), set(required), a.kwarg is not None


def _signature_change(old_sig, new_sig):
    """None if unchanged, else ('breaking'|'compatible', reason)."""
    norm = lambda s: re.sub(r"\s+", "", s or "")
    if norm(old_sig) == norm(new_sig):
        return None
    old, new = _params(old_sig), _params(new_sig)
    if not old or not new:
        return ("compatible", "signature text changed")
    removed = old[0] - new[0]
    newly_required = new[1] - old[1]
    if removed and not new[2]:
        return ("breaking", f"removed parameter{'s' if len(removed) > 1 else ''} {', '.join(sorted(removed))}")
    if newly_required:
        return ("breaking", f"new required parameter{'s' if len(newly_required) > 1 else ''} {', '.join(sorted(newly_required))}")
    added = new[0] - old[0]
    if added:
        return ("compatible", f"added optional {', '.join(sorted(added))}")
    return ("compatible", "annotations or defaults changed")


# ------------------------------------------------------------------ compare

def compare_refs(repo_url, base, head):
    url = normalize_repo_url(repo_url)
    base, head = _check_ref(base), _check_ref(head)
    if base == head:
        raise EvolutionError("Pick two different versions.")
    work = Path(tempfile.mkdtemp(prefix="codebase-evolution-"))
    try:
        def checkout(ref, name):
            args = ["clone", "--depth", "1", "--quiet"] + ([] if ref == "HEAD" else ["--branch", ref]) + [url, str(work / name)]
            _git(args)
            return work / name

        a, b = checkout(base, "base"), checkout(head, "head")
        files_a, api_a, deps_a = _snapshot(a)
        files_b, api_b, deps_b = _snapshot(b)

        # Commits between the two refs, from a history-only clone (no file contents)
        commits = {"count": None, "authors": [], "recent": [], "first_date": None, "last_date": None}
        try:
            _git(["clone", "--bare", "--filter=blob:none", "--quiet", url, str(work / "meta")], timeout=_GIT_TIMEOUT)
            rng = f"{base}..{head}"
            log = _git(["log", "--no-merges", "--format=%h%x1f%an%x1f%ad%x1f%s", "--date=short", rng], cwd=work / "meta")
            rows = [l.split("\x1f") for l in log.splitlines() if l.count("\x1f") == 3]
            commits = {
                "count": len(rows),
                "authors": [{"name": n, "commits": c} for n, c in Counter(r[1] for r in rows).most_common(6)],
                "recent": [{"sha": r[0], "author": r[1], "date": r[2], "subject": r[3]} for r in rows[:15]],
                "first_date": rows[-1][2] if rows else None,
                "last_date": rows[0][2] if rows else None,
            }
        except (EvolutionError, subprocess.TimeoutExpired):
            pass  # the structural diff stands on its own

        # Public API changes
        added = sorted(k for k in api_b if k not in api_a)
        removed = sorted(k for k in api_a if k not in api_b)
        changed = []
        for k in sorted(set(api_a) & set(api_b)):
            if api_a[k]["kind"] == "class":
                continue
            ch = _signature_change(api_a[k]["signature"], api_b[k]["signature"])
            if ch:
                changed.append({"name": k, "kind": api_b[k]["kind"], "severity": ch[0], "reason": ch[1],
                                "old": api_a[k]["signature"], "new": api_b[k]["signature"], "file": api_b[k]["file"]})
        # A removed name is not necessarily gone: it may have moved to another
        # module, or (for a method) to a base class the class now inherits.
        added_set = set(added)
        methods_b = {}
        for k, v in api_b.items():
            if v["kind"] == "method":
                cls, m = k.rsplit(".", 2)[-2:]
                methods_b.setdefault(m, set()).add(cls)
        relocated = []
        truly_removed = []
        for k in removed:
            kind = api_a[k]["kind"]
            tail = ".".join(k.split(".")[-2:]) if kind == "method" else k.split(".")[-1]
            same = [a for a in added_set if api_b[a]["kind"] == kind and a.endswith("." + tail)]
            if len(same) == 1:
                relocated.append({"name": k, "kind": kind, "to": same[0], "reason": f"moved to {same[0]}"})
                continue
            if kind == "method":
                cls_key, m = k.rsplit(".", 1)
                bases = [b.split(".")[-1] for b in (api_b.get(cls_key) or {}).get("bases", [])]
                owner = next((b for b in bases if b in methods_b.get(m, set())), None)
                if owner:
                    relocated.append({"name": k, "kind": kind, "to": f"{owner}.{m}", "reason": f"now inherited from {owner}"})
                    continue
            truly_removed.append(k)
        moved_targets = {r["to"] for r in relocated}
        added = [a for a in added if a not in moved_targets]
        removed = truly_removed
        breaking = [{"name": k, "kind": api_a[k]["kind"], "reason": "removed", "file": api_a[k]["file"]} for k in removed] + [
            c for c in changed if c["severity"] == "breaking"]

        # File churn. A file that disappears in one place and appears under the
        # same module path elsewhere (e.g. a move to a src/ layout) is a move,
        # diffed against its old content, not a full removal plus a full addition.
        def counts(old, new):
            plus = minus = 0
            for line in difflib.unified_diff((old or "").splitlines(), (new or "").splitlines(), lineterm="", n=0):
                if line.startswith("+") and not line.startswith("+++"):
                    plus += 1
                elif line.startswith("-") and not line.startswith("---"):
                    minus += 1
            return plus, minus

        only_a = {r for r in files_a if r not in files_b}
        only_b = {r for r in files_b if r not in files_a}
        moved_to = {}
        by_module_b = {}
        for r in only_b:
            by_module_b.setdefault(_module(r) if r.endswith(".py") else r.rsplit("/", 1)[-1], []).append(r)
        for r in sorted(only_a):
            key = _module(r) if r.endswith(".py") else r.rsplit("/", 1)[-1]
            cands = [c for c in by_module_b.get(key, []) if c not in moved_to.values()]
            if len(cands) == 1:
                moved_to[r] = cands[0]

        churn = []
        for rel in sorted(set(files_a) | set(files_b)):
            if rel in moved_to.values():
                continue
            if rel in moved_to:
                plus, minus = counts(files_a[rel], files_b[moved_to[rel]])
                churn.append({"path": moved_to[rel], "from": rel, "status": "moved", "added": plus, "removed": minus})
                continue
            old, new = files_a.get(rel), files_b.get(rel)
            if old == new:
                continue
            plus, minus = counts(old, new)
            churn.append({"path": rel, "status": "added" if old is None else "removed" if new is None else "modified",
                          "added": plus, "removed": minus})
        churn.sort(key=lambda f: f["added"] + f["removed"], reverse=True)

        def kind_of(api, k):
            return api[k]["kind"]

        return {
            "url": url,
            "base": base,
            "head": head,
            "summary": {
                "files_changed": len(churn),
                "lines_added": sum(f["added"] for f in churn),
                "lines_removed": sum(f["removed"] for f in churn),
                "api_added": len(added),
                "api_removed": len(removed),
                "api_changed": len(changed),
                "api_moved": len(relocated),
                "breaking": len(breaking),
                "commits": commits["count"],
            },
            "api": {
                "breaking": breaking,
                "added": [{"name": k, "kind": kind_of(api_b, k), "signature": api_b[k]["signature"], "file": api_b[k]["file"]} for k in added][:200],
                "removed": [{"name": k, "kind": kind_of(api_a, k), "file": api_a[k]["file"]} for k in removed][:200],
                "changed": changed[:200],
                "moved": relocated[:200],
            },
            "files": churn[:40],
            "dependencies": {"added": sorted(deps_b - deps_a), "removed": sorted(deps_a - deps_b), "kept": sorted(deps_a & deps_b)},
            "commits": commits,
        }
    except subprocess.TimeoutExpired:
        raise EvolutionError("Git took too long; try versions that are closer together or a smaller repository.")
    finally:
        remove_tree(work)


def evolution_markdown(r):
    s = r["summary"]
    out = [
        f"# {r['url'].rstrip('/').split('/')[-1]}: {r['base']} → {r['head']}",
        "",
        f"{s['commits'] if s['commits'] is not None else '?'} commits · {s['files_changed']} files changed "
        f"(+{s['lines_added']} / −{s['lines_removed']} lines) · public API: {s['api_added']} added, "
        f"{s['api_removed']} removed, {s['api_changed']} changed · **{s['breaking']} breaking**",
        "",
    ]
    if r["api"]["breaking"]:
        out += ["## Breaking changes", ""] + [f"- `{b['name']}` — {b['reason']}" for b in r["api"]["breaking"]] + [""]
    if r["api"]["added"]:
        out += ["## Added", ""] + [f"- `{a['name']}{a['signature'] or ''}`" for a in r["api"]["added"][:60]] + [""]
    compat = [c for c in r["api"]["changed"] if c["severity"] == "compatible"]
    if compat:
        out += ["## Changed (compatible)", ""] + [f"- `{c['name']}` — {c['reason']}" for c in compat[:60]] + [""]
    d = r["dependencies"]
    if d["added"] or d["removed"]:
        out += ["## Dependencies", "", f"Added: {', '.join(d['added']) or 'none'}", f"Removed: {', '.join(d['removed']) or 'none'}", ""]
    if r["files"]:
        out += ["## Most changed files", ""] + [f"- `{f['path']}` ({f['status']}, +{f['added']} −{f['removed']})" for f in r["files"][:15]]
    return "\n".join(out)
