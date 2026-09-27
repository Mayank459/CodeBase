"""API reference built from parsed source: signatures, docstrings, coverage.

Replaces the old "documentation", which pasted every file's raw code
(tests first) into one ~200 KB Markdown blob.
"""
import re

from app.parsers.python.extractor import extract_python_file

_SKIP_DIRS = {"tests", "test", "testing", "docs", "doc", "examples", "example", "benchmarks", "scripts"}
_SKIP_FILES = {"conftest.py", "setup.py", "conf.py", "noxfile.py", "__main__.py"}


def _is_api_file(path):
    parts = path.replace("\\", "/").split("/")
    name = parts[-1]
    return (
        name.endswith(".py")
        and name not in _SKIP_FILES
        and not name.startswith("test_")
        and not any(p in _SKIP_DIRS or p.startswith(".") for p in parts[:-1])
    )


def _module_name(path):
    parts = path.replace("\\", "/")[:-3].split("/")
    if parts and parts[0] in ("src", "lib"):
        parts = parts[1:]
    if parts and parts[-1] == "__init__":
        parts = parts[:-1]
    return ".".join(parts) or path


def _public(name):
    return not name.startswith("_")


def _strip_self(signature):
    """'(self, request, **kw)' -> '(request, **kw)', on one line."""
    inner = re.sub(r"\s+", " ", signature.strip()).replace("( ", "(").replace(" )", ")").replace(",)", ")")
    if inner.startswith("(") and inner.endswith(")"):
        body = inner[1:-1].strip()
        first, _, rest = body.partition(",")
        if first.strip().split(":")[0].strip() in ("self", "cls"):
            return f"({rest.strip()})"
    return inner


def _clean_doc(doc):
    """Drop a leading reST title ("requests.sessions" over "~~~~~"), which
    repeats the module name the page already shows as its heading."""
    lines = (doc or "").split("\n")
    if len(lines) >= 2 and lines[1].strip() and set(lines[1].strip()) <= set("~=-^*#") and len(lines[1].strip()) >= 3:
        return "\n".join(lines[2:]).strip()
    return doc or ""


def _summary(doc):
    return doc.split("\n\n", 1)[0].replace("\n", " ").strip() if doc else ""


def _deprecated(code, decorators):
    return "DeprecationWarning" in (code or "") or any("deprecat" in d.lower() for d in decorators or [])


def _kind(decorators):
    for d in decorators or []:
        base = d.split("(")[0].split(".")[-1]
        if base in ("property", "cached_property"):
            return "property"
        if base in ("classmethod", "staticmethod"):
            return base
        if base in ("setter", "getter", "deleter"):
            return "accessor"
    return "method"


def _callable(fn, owner_id):
    return {
        "id": f"{owner_id}::{fn.name}",
        "name": fn.name,
        "signature": _strip_self(getattr(fn, "signature", "") or "()"),
        "return_type": re.sub(r"\s+", " ", getattr(fn, "return_type", "") or ""),
        "docstring": getattr(fn, "docstring", "") or "",
        "summary": _summary(getattr(fn, "docstring", "")),
        "is_async": bool(getattr(fn, "is_async", False)),
        "deprecated": _deprecated(fn.code, getattr(fn, "decorators", [])),
        "decorators": list(getattr(fn, "decorators", []) or []),
        "start_line": fn.start_line,
        "end_line": fn.end_line,
    }


def build_reference(repository_index):
    modules = []
    for pf in repository_index.parsed_files:
        path = pf.file_path.replace("\\", "/")
        if not _is_api_file(path):
            continue
        # Re-parse from the stored source so repositories indexed before the
        # parser recorded signatures and docstrings still get full docs.
        source = getattr(pf, "source_code", "") or ""
        parsed = extract_python_file(path, source) if source else pf

        classes = []
        for cls in parsed.classes:
            if not _public(cls.name):
                continue
            cid = f"{path}::{cls.name}"
            init = next((m for m in cls.methods if m.name == "__init__"), None)
            methods = [_callable(m, cid) for m in cls.methods if _public(m.name)]
            for m in methods:
                m["kind"] = _kind(m["decorators"])
            classes.append({
                "id": cid,
                "name": cls.name,
                "bases": list(cls.bases or []),
                "signature": _strip_self(getattr(init, "signature", "") or "()") if init else "()",
                "docstring": getattr(cls, "docstring", "") or "",
                "summary": _summary(getattr(cls, "docstring", "")),
                "deprecated": _deprecated(cls.code[:2000], []),
                "start_line": cls.start_line,
                "end_line": cls.end_line,
                "methods": methods,
            })
        functions = [_callable(f, path) for f in parsed.functions if _public(f.name)]

        symbols = [*classes, *functions, *[m for c in classes for m in c["methods"]]]
        if not symbols and not _clean_doc(getattr(parsed, "module_docstring", "")):
            continue
        documented = sum(1 for s in symbols if s["docstring"])
        modules.append({
            "path": path,
            "module": _module_name(path),
            "docstring": _clean_doc(getattr(parsed, "module_docstring", "")),
            "public_count": len(symbols),
            "documented_count": documented,
            "classes": classes,
            "functions": functions,
        })

    # By dotted name: each package's __init__ comes right before its own modules
    modules.sort(key=lambda m: m["module"].split("."))
    total = sum(m["public_count"] for m in modules)
    documented = sum(m["documented_count"] for m in modules)
    return {
        "repository": repository_index.repository_name,
        "stats": {
            "modules": len(modules),
            "public_symbols": total,
            "documented": documented,
            "coverage_pct": round(100 * documented / total) if total else 0,
        },
        "modules": modules,
    }


def find_symbol(repository_index, symbol_id, with_kind=False):
    """Code of a function, method or class by reference id (and its kind)."""
    path, _, rest = symbol_id.partition("::")
    names = rest.split("::")
    for pf in repository_index.parsed_files:
        if pf.file_path.replace("\\", "/") != path:
            continue
        source = getattr(pf, "source_code", "") or ""
        parsed = extract_python_file(path, source) if source else pf
        if len(names) == 1:
            for f in parsed.functions:
                if f.name == names[0]:
                    return (f.code, "function") if with_kind else f.code
            for c in parsed.classes:
                if c.name == names[0]:
                    return (c.code, "class") if with_kind else c.code
        elif len(names) == 2:
            for c in parsed.classes:
                if c.name == names[0]:
                    for m in c.methods:
                        if m.name == names[1]:
                            return (m.code, "method") if with_kind else m.code
    return (None, None) if with_kind else None


def reference_to_markdown(ref, compact=False):
    s = ref["stats"]
    out = [
        f"# {ref['repository']} API reference",
        "",
        f"{s['public_symbols']} public symbols in {s['modules']} modules; "
        f"{s['documented']} documented ({s['coverage_pct']}%).",
        "",
    ]
    if compact:
        out += ["| Module | Public | Documented |", "| --- | --- | --- |"]
        for m in ref["modules"]:
            out.append(f"| `{m['module']}` | {m['public_count']} | {m['documented_count']} |")
        missing = [
            f"`{m['module']}.{x['name']}`"
            for m in ref["modules"] for x in [*m["classes"], *m["functions"]] if not x["docstring"]
        ]
        if missing:
            out += ["", f"**Missing docstrings ({len(missing)}):** " + ", ".join(missing[:40]) + (" …" if len(missing) > 40 else "")]
        out += ["", "Open the Docs tab for the full reference and to draft missing docstrings."]
        return "\n".join(out)

    def doc(text):
        return text if text else "_No docstring._"

    for m in ref["modules"]:
        out += ["---", "", f"## `{m['module']}`", "", f"`{m['path']}`", ""]
        if m["docstring"]:
            out += [m["docstring"], ""]
        for c in m["classes"]:
            bases = f"({', '.join(c['bases'])})" if c["bases"] else ""
            out += [f"### class `{c['name']}{bases}`", "", f"```python\n{c['name']}{c['signature']}\n```", "", doc(c["docstring"]), ""]
            for fn in c["methods"]:
                out += _md_callable(fn, prefix=f"{c['name']}.", level="####")
        for fn in m["functions"]:
            out += _md_callable(fn, level="###")
    return "\n".join(out)


def _md_callable(fn, prefix="", level="###"):
    ret = f" -> {fn['return_type']}" if fn["return_type"] else ""
    tags = [t for t in ("async" if fn["is_async"] else "", fn.get("kind") if fn.get("kind") not in (None, "method") else "", "deprecated" if fn["deprecated"] else "") if t]
    head = f"{level} `{prefix}{fn['name']}`" + (f" · {', '.join(tags)}" if tags else "")
    return [head, "", f"```python\n{'async ' if fn['is_async'] else ''}def {fn['name']}{fn['signature']}{ret}\n```", "", fn["docstring"] or "_No docstring._", ""]
