"""Architecture and dependency diagrams built from real module dependencies.

Both diagrams start from one file-level dependency graph: imports resolved to
the files they name (relative and absolute), plus resolved calls that cross
files. The old generator drew only call edges between files (almost none) and
used the same output for both diagram types.
"""
import os
import sys
from collections import defaultdict

import networkx as nx

_CODE_EXTS = (".py", ".js", ".jsx", ".ts", ".tsx")
_NOISE_EXTS = ('.md', '.yaml', '.yml', '.toml', '.json', '.txt', '.lock', '.rst', '.cfg', '.ini', '.html', '.css')
_STDLIB = set(getattr(sys, "stdlib_module_names", ())) | {"__future__"}

# Paper palette (matches the frontend): ink on pulp
_STYLE = [
    "  classDef default fill:#f2ece1,stroke:#2a2724,stroke-width:1.25px,color:#2a2724;",
    "  classDef entry fill:#f2ece1,stroke:#b3262d,stroke-width:2px,color:#2a2724;",
    "  classDef ext fill:#e8e0d2,stroke:#6b645b,stroke-width:1px,stroke-dasharray:4 3,color:#4a443d;",
]


class ArchitectureDiagramGenerator:

    MAX_EDGES = 60

    def __init__(self, repository_index):
        self.repository_index = repository_index
        self.graph = repository_index.graph

    @staticmethod
    def _escape_label(label):
        return label.replace("\\", "\\\\").replace('"', "'")

    @staticmethod
    def _clean_id(name):
        return "".join(c if c.isalnum() else "_" for c in name).strip("_")

    def _is_noise(self, path):
        # Judge the file part of a node id: "README.md::file_content" used to pass
        # because the whole id does not end in ".md", producing the diagram hairball.
        low = path.split("::")[0].lower().replace("\\", "/")
        if any(low.endswith(ext) for ext in _NOISE_EXTS):
            return True
        parts = low.split("/")
        name = parts[-1]
        if any(p in ("tests", "test", "docs", "examples") for p in parts[:-1]) or name.startswith("test_") or name in ("conf.py", "setup.py", "conftest.py"):
            return True
        return False

    # ------------------------------------------------------------ dependency graph

    def _code_files(self):
        return [
            p.file_path.replace("\\", "/")
            for p in self.repository_index.parsed_files
            if p.file_path.lower().endswith(_CODE_EXTS) and not self._is_noise(p.file_path)
        ]

    @staticmethod
    def _module_name(path):
        """src/requests/models.py -> requests.models ; pkg/__init__.py -> pkg"""
        parts = path[:-3].split("/") if path.endswith(".py") else os.path.splitext(path)[0].split("/")
        if parts and parts[0] in ("src", "lib"):
            parts = parts[1:]
        if parts and parts[-1] == "__init__":
            parts = parts[:-1]
        return ".".join(parts)

    def _resolve_import(self, module, importer, modules):
        """File path an import refers to, or None when it is external."""
        module = (module or "").strip()
        if not module:
            return None
        if module.startswith("."):
            level = len(module) - len(module.lstrip("."))
            rest = module.lstrip(".")
            if not rest:
                # "from . import util": the parser keeps only ".", not the names,
                # so the target module is unknown; pointing it at __init__ would
                # invent a dependency (and a cycle through the package).
                return None
            pkg = self._module_name(importer).split(".")
            if not importer.endswith("__init__.py"):
                pkg = pkg[:-1]  # a module's package
            base = pkg[: len(pkg) - (level - 1)] if level > 1 else pkg
            target = ".".join([p for p in base + ([rest] if rest else []) if p])
        else:
            target = module.split(",")[0].split(" as ")[0].strip()
        # Longest known module that the import names (import a.b.c may mean module a.b)
        parts = target.split(".")
        for n in range(len(parts), 0, -1):
            hit = modules.get(".".join(parts[:n]))
            if hit and hit != importer:
                return hit
        return None

    def _dependency_graph(self):
        files = self._code_files()
        modules = {self._module_name(f): f for f in files}
        file_set = set(files)
        deps = nx.DiGraph()
        deps.add_nodes_from(files)
        external = defaultdict(set)  # file -> third-party top-level packages

        def bump(a, b, kind):
            if deps.has_edge(a, b):
                deps[a][b]["weight"] += 1
                deps[a][b]["kinds"].add(kind)
            else:
                deps.add_edge(a, b, weight=1, kinds={kind})

        for u, v, d in self.graph.edges(data=True):
            rel = d.get("relation")
            src = u.split("::")[0].replace("\\", "/")
            if src not in file_set:
                continue
            if rel == "imports":
                target = self._resolve_import(v, src, modules)
                if target:
                    bump(src, target, "imports")
                else:
                    top = str(v).lstrip(".").split(".")[0].split(",")[0].split(" as ")[0].strip()
                    if top and not str(v).startswith(".") and top not in _STDLIB and top not in {m.split(".")[0] for m in modules}:
                        external[src].add(top)
            elif rel == "calls" and not d.get("is_external"):
                dst = v.split("::")[0].replace("\\", "/")
                if dst in file_set and dst != src:
                    bump(src, dst, "calls")
        return deps, external

    def _label(self, path, all_paths):
        sizes = getattr(self, "_group_sizes", None)
        if sizes:  # package-level diagram: show the directory and how many modules it holds
            n = sizes.get(path, 0)
            where = "(repo root)" if path in (".", "") else f"{path}/"
            return self._escape_label(f"{where} · {n} {'file' if n == 1 else 'files'}")
        name = path.rsplit("/", 1)[-1]
        same = [p for p in all_paths if p.rsplit("/", 1)[-1] == name]
        if len(same) > 1:  # disambiguate e.g. several __init__.py
            name = "/".join(path.split("/")[-2:])
        return self._escape_label(name)

    def _edge_lines(self, deps, ids, with_weights):
        edges = sorted(deps.edges(data=True), key=lambda e: e[2]["weight"], reverse=True)[: self.MAX_EDGES]
        out = []
        for a, b, d in edges:
            if with_weights and d["weight"] > 1:
                out.append(f"  {ids[a]} -->|{d['weight']}| {ids[b]}")
            else:
                out.append(f"  {ids[a]} --> {ids[b]}")
        return out, len(deps.edges()) > self.MAX_EDGES

    # ------------------------------------------------------------ diagrams

    # Above this many modules a file-level picture is a wall of boxes; group by package
    MAX_FILE_NODES = 40
    MAX_GROUPS = 30

    def _grouped(self, deps, external):
        """Collapse files into their directories (packages), summing edge weights."""
        dirs = {f: (os.path.dirname(f) or ".") for f in deps.nodes()}
        depth = max(len(d.split("/")) for d in dirs.values())
        while len(set(dirs.values())) > self.MAX_GROUPS and depth > 1:
            depth -= 1
            dirs = {f: "/".join(d.split("/")[:depth]) for f, d in dirs.items()}
        grouped = nx.DiGraph()
        sizes = defaultdict(int)
        for f, g in dirs.items():
            sizes[g] += 1
            grouped.add_node(g)
        for a, b, d in deps.edges(data=True):
            ga, gb = dirs[a], dirs[b]
            if ga == gb:
                continue
            if grouped.has_edge(ga, gb):
                grouped[ga][gb]["weight"] += d["weight"]
            else:
                grouped.add_edge(ga, gb, weight=d["weight"], kinds=set(d["kinds"]))
        ext = defaultdict(set)
        for f, pkgs in external.items():
            ext[dirs.get(f, f)] |= pkgs
        self._group_sizes = dict(sizes)
        return grouped, ext

    def generate(self, kind="architecture"):
        deps, external = self._dependency_graph()
        if deps.number_of_nodes() == 0:
            return "graph TB\n  empty[\"No source modules found\"]"
        self._group_sizes = None
        if deps.number_of_nodes() > self.MAX_FILE_NODES:
            deps, external = self._grouped(deps, external)
        if kind == "dependencies":
            return self._dependencies(deps, external)
        return self._architecture(deps)

    def _architecture(self, deps):
        """Modules in layers by dependency depth: foundation imports nothing
        inside the repository; entry modules are imported by nothing."""
        cond = nx.condensation(deps)  # collapse import cycles
        depth = {}
        for c in reversed(list(nx.topological_sort(cond))):
            succ = list(cond.successors(c))
            depth[c] = 0 if not succ else 1 + max(depth[s] for s in succ)
        max_depth = max(depth.values()) if depth else 0

        def layer_of(node_rank, has_importers):
            if node_rank == 0:
                return 3, "Foundation — imports nothing inside the repository"
            if not has_importers:
                return 0, "Entry — nothing inside the repository imports these"
            return (1 if node_rank >= max_depth / 2 else 2), ("Orchestration" if node_rank >= max_depth / 2 else "Core")

        layers = defaultdict(list)
        titles = {}
        for c, members in cond.nodes(data="members"):
            for f in members:
                idx, title = layer_of(depth[c], deps.in_degree(f) > 0)
                layers[idx].append(f)
                titles[idx] = title

        paths = list(deps.nodes())
        ids = {f: f"m_{self._clean_id(f) or 'root'}" for f in paths}
        lines = ["graph TB", ""]
        for idx in sorted(layers):
            lines.append(f'  subgraph L{idx} ["{titles[idx]}"]')
            lines.append("    direction LR")
            for f in sorted(layers[idx]):
                lines.append(f'    {ids[f]}["{self._label(f, paths)}"]')
            lines.append("  end")
        lines.append("")
        # Almost every module leans on the foundation; one weighted arrow per
        # layer says that without drawing dozens of parallel lines into it.
        layer_of_file = {f: idx for idx, files in layers.items() for f in files}
        into_foundation = defaultdict(int)
        upper = nx.DiGraph()
        for a, b, d in deps.edges(data=True):
            la, lb = layer_of_file[a], layer_of_file[b]
            if lb == 3 and la != 3:
                into_foundation[la] += d["weight"]
            elif la != 3:
                upper.add_edge(a, b, **d)
        edge_lines, truncated = self._edge_lines(upper, ids, with_weights=False)
        lines += edge_lines
        for la, n in sorted(into_foundation.items()):
            lines.append(f"  L{la} ==>|{n} imports| L3")
        lines.append("")
        lines += _STYLE
        entry = [ids[f] for f in layers.get(0, [])]
        if entry:
            lines.append(f"  class {','.join(entry)} entry;")
        if truncated:
            lines.append(f"  %% showing the {self.MAX_EDGES} heaviest of {upper.number_of_edges()} dependencies")
        return "\n".join(lines)

    def _dependencies(self, deps, external):
        """Who depends on whom, weighted by imports plus cross-file calls, with
        third-party packages alongside."""
        connected = [n for n in deps.nodes() if deps.degree(n) > 0 or external.get(n)]
        sub = deps.subgraph(connected)
        paths = list(sub.nodes())
        ids = {f: f"m_{self._clean_id(f) or 'root'}" for f in paths}

        by_dir = defaultdict(list)
        for f in paths:
            by_dir[os.path.dirname(f) or "root"].append(f)

        lines = ["graph LR", ""]
        for i, (d, files) in enumerate(sorted(by_dir.items()), 1):
            lines.append(f'  subgraph D{i} ["{self._escape_label(d)}"]')
            for f in sorted(files):
                lines.append(f'    {ids[f]}["{self._label(f, paths)}"]')
            lines.append("  end")
        lines.append("")
        edge_lines, truncated = self._edge_lines(sub, ids, with_weights=True)
        lines += edge_lines

        ext_pkgs = sorted({p for pkgs in external.values() for p in pkgs})
        if ext_pkgs:
            lines.append("")
            lines.append('  subgraph EXT ["Third-party packages"]')
            for pkg in ext_pkgs:
                lines.append(f'    x_{self._clean_id(pkg)}["{self._escape_label(pkg)}"]:::ext')
            lines.append("  end")
            for f, pkgs in sorted(external.items()):
                if f in ids:
                    for pkg in sorted(pkgs):
                        lines.append(f"  {ids[f]} -.-> x_{self._clean_id(pkg)}")
        lines.append("")
        lines += _STYLE
        if truncated:
            lines.append(f"  %% showing the {self.MAX_EDGES} heaviest of {sub.number_of_edges()} dependencies")
        return "\n".join(lines)
