"""Regression tests for the backend correctness fixes (branch fix/backend-correctness)."""

import pytest

from app.parsers.python.extractor import extract_python_file
from app.indexing.index_builder import IndexBuilder
from app.indexing.models.entity_extractor import EntityExtractor


def build(files):
    parsed = []
    for path, src in files.items():
        pf = extract_python_file(path, src)
        pf.source_code = src
        parsed.append(pf)
    return IndexBuilder().build("demo", parsed), parsed


# --------------------------------------------------------------------- parser

def test_decorated_definitions_are_extracted_with_decorators():
    src = (
        "@app.get('/x')\n"
        "def route():\n    return 1\n\n"
        "@dataclass\n"
        "class Point:\n"
        "    x: int\n"
        "    @property\n"
        "    def norm(self):\n        return self.x\n"
    )
    pf = extract_python_file("m.py", src)
    assert [f.name for f in pf.functions] == ["route"]
    assert pf.functions[0].decorators == ["app.get('/x')"]
    assert pf.functions[0].start_line == 1  # span includes the decorator
    assert [c.name for c in pf.classes] == ["Point"]
    assert [m.name for m in pf.classes[0].methods] == ["norm"]
    assert pf.classes[0].methods[0].decorators == ["property"]


def test_code_slices_are_correct_after_non_ascii_text():
    src = '# café — naïve résumé\ndef après():\n    return "ok"\n\ndef second():\n    return 2\n'
    pf = extract_python_file("u.py", src)
    codes = {f.name: f.code for f in pf.functions}
    assert codes["après"].startswith("def après():")
    assert codes["second"] == "def second():\n    return 2"


def test_long_files_are_parsed_to_the_end():
    filler = "".join(f"def f{i}():\n    return {i}\n\n" for i in range(600))  # ~15 KB
    pf = extract_python_file("long.py", filler + "def last_one():\n    return 0\n")
    assert pf.functions[-1].name == "last_one"


def test_entities_carry_line_numbers():
    _, parsed = build({"a.py": "def f():\n    return 1\n\nclass C:\n    def m(self):\n        pass\n"})
    ents = {e.name: e for e in EntityExtractor().extract_entities(parsed)}
    assert (ents["f"].start_line, ents["f"].end_line) == (1, 2)
    assert (ents["m"].start_line, ents["m"].end_line) == (5, 6)


# ------------------------------------------------------------ ids and names

def test_point_ids_are_deterministic_and_repository_scoped():
    from app.storage.vector_store import point_id
    assert point_id("requests", "a.py::f") == point_id("requests", "a.py::f")
    assert point_id("requests", "a.py::f") != point_id("flask", "a.py::f")


@pytest.mark.parametrize("raw", ["requests", "psf/requests", "https://github.com/psf/requests.git", " requests/ "])
def test_normalize_repo_name(raw):
    from app.storage.repository_registry import normalize_repo_name
    assert normalize_repo_name(raw) == "requests"


def test_registry_matches_case_insensitively_but_never_by_substring():
    from app.storage.repository_registry import RepositoryRegistry
    reg = RepositoryRegistry.__new__(RepositoryRegistry)
    import threading
    reg.repositories = {"fastapi": {"index": "FASTAPI"}, "Requests": {"index": "REQ"}}
    reg._lock = threading.RLock()
    reg._rehydrate_failed = {}
    assert reg._find_key("psf/requests") == "Requests"
    assert reg._find_key("REQUESTS") == "Requests"
    assert reg._find_key("api") is None  # used to return fastapi
    assert reg.resolve("psf/requests") == "Requests"


def test_registry_rebuilds_a_repository_that_only_exists_in_qdrant(monkeypatch):
    import threading
    from app.storage import repository_registry as rr
    import app.storage.vector_store as vs
    import app.services.repository_indexer as ri

    reg = rr.RepositoryRegistry.__new__(rr.RepositoryRegistry)
    reg.repositories, reg._lock, reg._rehydrate_failed = {}, threading.RLock(), {}
    monkeypatch.setattr(reg, "_save", lambda: None)
    monkeypatch.setattr(reg, "_load", lambda: None)  # simulate a restart: nothing on disk either
    idx, parsed = build({"a.py": "def f():\n    return 1\n"})
    idx.repository_name = "requests"
    monkeypatch.setattr(vs, "count_repository_points", lambda name: 5 if name == "requests" else 0)
    monkeypatch.setattr(vs, "get_repository_source_url", lambda name: "https://github.com/psf/requests")
    monkeypatch.setattr(ri, "rebuild_graph", lambda url: (idx, EntityExtractor().extract_entities(parsed)))

    assert reg.get("psf/requests") is idx
    assert reg.contains("requests")
    assert reg.get("flask") is None  # no vectors: no rebuild


def test_bm25_keeps_repositories_apart_and_accepts_owner_names():
    from app.retrieval.sparse_search import BM25Retriever
    from app.indexing.models.code_entity import CodeEntity
    bm = BM25Retriever()
    bm.index_entities("requests", [CodeEntity(1, "api.py::send_request", "function", "send_request", "api.py", "def send_request(): pass")])
    bm.index_entities("flask", [CodeEntity(1, "app.py::route_handler", "function", "route_handler", "app.py", "def route_handler(): pass")])
    hits = bm.search("send_request", repository_name="psf/requests")
    assert [h.payload["name"] for h in hits] == ["send_request"]
    assert bm.search("send_request", repository_name="flask") == []


# ---------------------------------------------------------------- scanner

def test_scanner_ignores_only_paths_inside_the_repository(tmp_path):
    from app.indexing.scanner import scan_repository
    repo = tmp_path / "build" / "repo"  # parent folder named like an ignored dir
    (repo / "pkg").mkdir(parents=True)
    (repo / "pkg" / "a.py").write_text("x = 1")
    (repo / ".github").mkdir()
    (repo / ".github" / "ci.yml").write_text("a: 1")
    (repo / ".readthedocs.yaml").write_text("v: 2")
    (repo / "demo.egg-info").mkdir()
    (repo / "demo.egg-info" / "PKG-INFO").write_text("z")
    found = sorted(p.relative_to(repo).as_posix() for p in scan_repository(repo))
    assert found == ["pkg/a.py"]


# ------------------------------------------------------- call resolution

def test_self_calls_resolve_to_the_same_class_and_ambiguous_names_do_not():
    src = (
        "class A:\n"
        "    def run(self):\n        self.helper()\n"
        "    def helper(self):\n        pass\n"
        "class B:\n"
        "    def helper(self):\n        pass\n"
    )
    idx, _ = build({"m.py": src})
    targets = [v for _, v, d in idx.graph.out_edges("m.py::A::run", data=True) if d.get("relation") == "calls"]
    assert targets == ["m.py::A::helper"]


def test_calling_a_class_reaches_its_constructor():
    idx, _ = build({"m.py": "class S:\n    def __init__(self):\n        pass\n\ndef make():\n    return S()\n"})
    targets = {v for _, v, d in idx.graph.out_edges("m.py::make", data=True) if d.get("relation") == "calls"}
    assert {"m.py::S", "m.py::S::__init__"} <= targets


# ------------------------------------------------------------- dead code

def test_dead_code_finds_unreferenced_code_and_skips_used_or_framework_code():
    from app.dead_code.analyzer import DeadCodeAnalyzer
    src = (
        "def used():\n    return 1\n\n"
        "def caller():\n    return used()\n\n"
        "def _orphan():\n    return 2\n\n"
        "def public_orphan():\n    return 3\n\n"
        "def callback():\n    return 4\n\n"
        "HANDLERS = {'x': callback}\n\n"
        "@app.get('/r')\n"
        "def route():\n    return 5\n\n"
        "class K:\n"
        "    def __repr__(self):\n        return 'k'\n"
    )
    idx, _ = build({"mod.py": src, "tests/test_mod.py": "def test_something():\n    assert True\n"})
    findings = {f.name: f for f in DeadCodeAnalyzer(idx).analyze()}
    assert findings["_orphan"].confidence == "high"
    assert findings["_orphan"].start_line == 7
    assert findings["public_orphan"].confidence == "medium"
    for not_dead in ("used", "callback", "route", "__repr__", "test_something"):
        assert not_dead not in findings


def test_dead_code_agent_returns_structured_findings():
    from app.storage.repository_registry import repository_registry
    from app.agents.dead_code_agent import dead_code_node
    idx, _ = build({"z.py": "def _never():\n    return 1\n"})
    repository_registry.repositories["zz_dead_code_demo"] = {"index": idx, "timestamp": 0}
    try:
        state = dead_code_node({"repository_name": "zz_dead_code_demo"})
    finally:
        repository_registry.repositories.pop("zz_dead_code_demo", None)
    assert [f["name"] for f in state["dead_code"]] == ["_never"]
    assert "_never" in state["answer"]


# ---------------------------------------------------------- architecture

def test_architecture_hubs_and_pattern_come_from_real_structure():
    from app.analysis.architecture_analyzer import ArchitectureAnalyzer
    files = {
        "pkg/__init__.py": "from .core import run\n",
        "pkg/core.py": "def helper():\n    return 1\n\ndef run():\n    return helper() + helper2()\n\ndef helper2():\n    return helper()\n",
        "pkg/hooks.py": "def dispatch():\n    return 1\n",  # a Python hooks module is not client state
    }
    idx, _ = build(files)
    result = ArchitectureAnalyzer(idx).analyze()
    assert result["overview"]["architecture_pattern"] == "Library"
    hub_nodes = [h["node"] for h in result["centrality_hubs"]]
    assert hub_nodes and all("::" in n for n in hub_nodes)  # code nodes only, never files
    assert hub_nodes[0] == "pkg/core.py::helper"  # called from two places
    assert result["overview"]["modularity_score"] == 100  # every call stays inside core.py
    assert "State & Client Store" not in [l["name"] for l in result["layers"]]
    assert any(e["type"] == "Package Public API" for e in result["entry_points"])


# -------------------------------------------------------------- security

def test_security_report_with_no_findings_makes_no_grade_claims(monkeypatch):
    from app.storage.repository_registry import repository_registry
    from app.agents.security_agent import security_node
    idx, _ = build({"clean.py": "def add(a, b):\n    return a + b\n"})
    repository_registry.repositories["zz_security_demo"] = {"index": idx, "timestamp": 0}
    try:
        state = security_node({"repository_name": "zz_security_demo"})
    finally:
        repository_registry.repositories.pop("zz_security_demo", None)
    assert "A+" not in state["answer"] and "100 / 100" not in state["answer"]
    assert "not proof" in state["answer"]


# ------------------------------------------------------------- diagrams

def _diagram_repo():
    return build({
        "src/pkg/__init__.py": "from .api import get\n",
        "src/pkg/api.py": "from .core import run\nimport urllib3\n\ndef get():\n    return run()\n",
        "src/pkg/core.py": "from . import util\nfrom pkg.util import helper\n\ndef run():\n    return helper()\n",
        "src/pkg/util.py": "import os\n\ndef helper():\n    return 1\n",
        "README.md": "# demo\n",
        "tests/test_api.py": "from pkg.api import get\n",
    })[0]


def test_diagram_dependencies_resolve_relative_and_absolute_imports():
    from app.uml.architecture_diagram import ArchitectureDiagramGenerator
    deps, external = ArchitectureDiagramGenerator(_diagram_repo())._dependency_graph()
    assert deps.has_edge("src/pkg/api.py", "src/pkg/core.py")       # from .core import run
    assert deps.has_edge("src/pkg/core.py", "src/pkg/util.py")      # from pkg.util import helper
    assert "README.md" not in deps and "tests/test_api.py" not in deps
    assert external["src/pkg/api.py"] == {"urllib3"}                # third-party, not os (stdlib)


def test_architecture_and_dependency_diagrams_differ_and_use_paper_styling():
    from app.uml.architecture_diagram import ArchitectureDiagramGenerator
    gen = ArchitectureDiagramGenerator(_diagram_repo())
    arch, dep = gen.generate("architecture"), gen.generate("dependencies")
    assert arch != dep
    assert arch.startswith("graph TB") and "Foundation" in arch and "Entry" in arch
    assert dep.startswith("graph LR") and "Third-party packages" in dep and "urllib3" in dep
    for d in (arch, dep):
        assert "#0f172a" not in d and "file_content" not in d and "README" not in d


def test_diagram_agent_picks_the_diagram_kind_from_the_question():
    from app.storage.repository_registry import repository_registry
    from app.agents.architecture_diagram_agent import architecture_diagram_node
    repository_registry.repositories["zz_diagram_demo"] = {"index": _diagram_repo(), "timestamp": 0}
    try:
        arch = architecture_diagram_node({"repository_name": "zz_diagram_demo", "question": "generate architecture diagram uml"})["answer"]
        dep = architecture_diagram_node({"repository_name": "zz_diagram_demo", "question": "generate dependency diagram uml"})["answer"]
    finally:
        repository_registry.repositories.pop("zz_diagram_demo", None)
    assert arch.startswith("graph TB") and dep.startswith("graph LR")
