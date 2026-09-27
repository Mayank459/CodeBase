"""Tests for the side-by-side repository comparison."""
from tests.test_correctness_fixes import build


def _compare_repos():
    lib = build({
        "src/lib/__init__.py": '"""Lib."""\nfrom .client import Client\n',
        "src/lib/client.py": (
            "import urllib3\n\n"
            "class Client:\n"
            "    '''A client.'''\n"
            "    def get(self):\n        return _helper()\n\n"
            "def _helper():\n    return 1\n\n"
            "def _unused():\n    return 2\n"
        ),
    })[0]
    app_ = build({
        "svc/app.py": "import urllib3\nimport flask\n\nclass Client:\n    def get(self):\n        return 1\n",
    })[0]
    lib.repository_name, app_.repository_name = "zz_cmp_lib", "zz_cmp_app"
    return lib, app_


def _register(*indexes):
    from app.storage.repository_registry import repository_registry
    for idx in indexes:
        repository_registry.repositories[idx.repository_name] = {"index": idx, "timestamp": 0}


def _unregister(*indexes):
    from app.storage.repository_registry import repository_registry
    for idx in indexes:
        repository_registry.repositories.pop(idx.repository_name, None)


def test_compare_profiles_indexed_repos_and_reports_missing_ones():
    from app.comparison.profile import compare_repositories, comparison_markdown
    lib, app_ = _compare_repos()
    _register(lib, app_)
    try:
        res = compare_repositories(["owner/zz_cmp_lib", "zz_cmp_app", "ZZ_CMP_LIB", "zz_cmp_never_indexed"])
    finally:
        _unregister(lib, app_)
    assert [r["name"] for r in res["repositories"]] == ["zz_cmp_lib", "zz_cmp_app"]  # duplicate input merged
    assert res["missing"] == [{"input": "zz_cmp_never_indexed", "name": "zz_cmp_never_indexed"}]
    lib_p = res["repositories"][0]
    assert lib_p["api"]["doc_coverage_pct"] == 50  # Client documented, Client.get not
    assert lib_p["quality"]["dead_code"] == 2  # _unused (high) and the uncalled public Client.get (medium)
    assert lib_p["quality"]["dead_code_high_confidence"] == 1
    assert lib_p["stack"]["dependencies"] == ["urllib3"]
    assert res["shared"]["dependencies"] == ["urllib3"]
    assert "Client" in res["shared"]["public_names"]
    md = comparison_markdown(res)
    assert "| Documented | 50% | 0% |" in md and "Not indexed yet" in md


def test_compare_route_returns_structured_result():
    from fastapi.testclient import TestClient
    from main import app
    lib, app_ = _compare_repos()
    _register(lib, app_)
    try:
        r = TestClient(app).post("/repository/compare", json={"repositories": ["zz_cmp_lib", "zz_cmp_app"]})
    finally:
        _unregister(lib, app_)
    body = r.json()
    assert r.status_code == 200
    assert len(body["repositories"]) == 2 and body["missing"] == [] and "markdown" in body


def test_receiver_calls_with_builtin_method_names_are_not_linked_to_repo_methods():
    idx = build({"m.py": (
        "class Store:\n    def get(self, key):\n        return 1\n\n"
        "def use(d):\n    return d.get('x')\n\n"
        "def use_store():\n    s = Store()\n    return s.fetch()\n"
    )})[0]
    targets = [v for _, v, d in idx.graph.out_edges("m.py::use", data=True) if d.get("relation") == "calls"]
    assert "m.py::Store::get" not in targets  # dict.get is not Store.get


def test_a_framework_repository_is_not_a_user_of_itself():
    from app.analysis.architecture_analyzer import ArchitectureAnalyzer
    idx = build({
        "src/flask/__init__.py": "from .app import Flask\n",
        "src/flask/app.py": "class Flask:\n    pass\n",
        "tests/test_app.py": "import flask\n\ndef test_it():\n    flask.Flask()\n",
    })[0]
    result = ArchitectureAnalyzer(idx).analyze()
    assert "Flask" not in [f["name"] for f in result["tech_stack"]["frameworks"]]
    assert result["overview"]["architecture_pattern"] == "Library"
