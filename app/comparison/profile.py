"""Side-by-side repository comparison built from the same analyses the other
tools use (architecture, API reference, dead code, security, dependencies),
so a number here always matches the tab it comes from.

Replaces the old report, which printed six raw counts per repository and
silently dropped any repository that was not indexed.
"""
from collections import Counter

from app.storage.repository_registry import repository_registry, normalize_repo_name

SEVERITIES = ("CRITICAL", "HIGH", "MEDIUM", "LOW")


def profile(repository_index):
    """Everything the Compare tab shows for one indexed repository."""
    from app.analysis.architecture_analyzer import ArchitectureAnalyzer
    from app.documentation.api_reference import build_reference
    from app.dead_code.analyzer import DeadCodeAnalyzer
    from app.security.scanner import SecurityScanner
    from app.uml.architecture_diagram import ArchitectureDiagramGenerator

    arch = ArchitectureAnalyzer(repository_index).analyze()
    ov = arch["overview"]
    ref = build_reference(repository_index)
    dead = DeadCodeAnalyzer(repository_index).analyze()
    findings = SecurityScanner().scan_repository(repository_index.parsed_files)
    _, external = ArchitectureDiagramGenerator(repository_index)._dependency_graph()

    classes = functions = methods = 0
    for pf in repository_index.parsed_files:
        classes += len(pf.classes)
        functions += len(pf.functions)
        methods += sum(len(c.methods) for c in pf.classes)

    severity = Counter(str(getattr(f, "severity", "")).upper() for f in findings)
    public_names = sorted({
        name
        for m in ref["modules"]
        for name in [*(c["name"] for c in m["classes"]), *(f["name"] for f in m["functions"])]
    })
    return {
        "name": repository_index.repository_name,
        "size": {
            "files": ov["total_files"],
            "lines": ov["total_loc"],
            "classes": classes,
            "functions": functions,
            "methods": methods,
        },
        "api": {
            "modules": ref["stats"]["modules"],
            "public_symbols": ref["stats"]["public_symbols"],
            "doc_coverage_pct": ref["stats"]["coverage_pct"],
        },
        "structure": {
            "pattern": ov["architecture_pattern"],
            "calls_per_symbol": ov["coupling_density"],
            "same_file_calls_pct": ov["modularity_score"],
            "hubs": [
                {"node": h["node"], "callers": h["in_degree"], "callees": h["out_degree"]}
                for h in arch["centrality_hubs"][:3]
            ],
        },
        "stack": {
            "primary_language": arch["tech_stack"]["primary_language"],
            "frameworks": [f["name"] for f in arch["tech_stack"]["frameworks"]],
            "dependencies": sorted({p for pkgs in external.values() for p in pkgs}),
        },
        "quality": {
            "dead_code": len(dead),
            "dead_code_high_confidence": sum(1 for d in dead if d.confidence == "high"),
            "security": {s.lower(): severity.get(s, 0) for s in SEVERITIES},
        },
        "public_names": public_names,
    }


def compare_repositories(requested):
    """Profiles for every indexed repository, and which ones still need indexing."""
    repos, missing, seen = [], [], set()
    for raw in requested:
        raw = (raw or "").strip()
        if not raw:
            continue
        key = normalize_repo_name(raw).lower()
        if key in seen:
            continue
        seen.add(key)
        index = repository_registry.get(raw)
        if index is None:
            missing.append({"input": raw, "name": normalize_repo_name(raw)})
        else:
            repos.append({"input": raw, **profile(index)})

    shared = {}
    if len(repos) >= 2:
        deps = [set(r["stack"]["dependencies"]) for r in repos]
        frameworks = [set(r["stack"]["frameworks"]) for r in repos]
        names = [set(r["public_names"]) for r in repos]
        common_names = set.intersection(*names)
        union_names = set.union(*names)
        shared = {
            "dependencies": sorted(set.intersection(*deps)),
            "frameworks": sorted(set.intersection(*frameworks)),
            "public_names": sorted(common_names)[:60],
            "public_name_overlap_pct": round(100 * len(common_names) / len(union_names)) if union_names else 0,
        }
    for r in repos:  # the full name lists are only needed for the overlap
        r["public_names_count"] = len(r.pop("public_names"))
    return {"repositories": repos, "missing": missing, "shared": shared}


def comparison_markdown(result):
    repos = result["repositories"]
    if not repos:
        return "No indexed repositories to compare."
    head = "| | " + " | ".join(f"`{r['name']}`" for r in repos) + " |"
    rule = "| --- |" + " --- |" * len(repos)

    def row(label, get):
        return f"| {label} | " + " | ".join(str(get(r)) for r in repos) + " |"

    lines = [
        "# Repository comparison", "", head, rule,
        row("Files", lambda r: r["size"]["files"]),
        row("Lines", lambda r: f"{r['size']['lines']:,}"),
        row("Classes / functions / methods", lambda r: f"{r['size']['classes']} / {r['size']['functions']} / {r['size']['methods']}"),
        row("Public API symbols", lambda r: r["api"]["public_symbols"]),
        row("Documented", lambda r: f"{r['api']['doc_coverage_pct']}%"),
        row("Pattern", lambda r: r["structure"]["pattern"]),
        row("Calls per symbol", lambda r: r["structure"]["calls_per_symbol"]),
        row("Calls within the same file", lambda r: f"{r['structure']['same_file_calls_pct']}%"),
        row("Frameworks", lambda r: ", ".join(r["stack"]["frameworks"]) or "none"),
        row("Third-party packages", lambda r: ", ".join(r["stack"]["dependencies"]) or "none"),
        row("Dead code (high confidence)", lambda r: f"{r['quality']['dead_code']} ({r['quality']['dead_code_high_confidence']})"),
        row("Security findings (critical/high/medium/low)", lambda r: "/".join(str(r["quality"]["security"][s.lower()]) for s in SEVERITIES)),
    ]
    sh = result.get("shared") or {}
    if sh:
        lines += [
            "",
            f"**Shared third-party packages:** {', '.join(sh['dependencies']) or 'none'}",
            f"**Shared public names:** {sh['public_name_overlap_pct']}% overlap"
            + (f" ({', '.join(sh['public_names'][:15])})" if sh["public_names"] else ""),
        ]
    if result.get("missing"):
        lines += ["", "Not indexed yet: " + ", ".join(f"`{m['name']}`" for m in result["missing"])]
    return "\n".join(lines)
