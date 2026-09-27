"""Dead code analyzer."""
import re

from app.dead_code.models import DeadCodeFinding

# Names the runtime or a framework calls without a visible call site
_ENTRY_NAMES = {"main", "setup", "teardown", "setUp", "tearDown", "setUpClass", "tearDownClass"}


class DeadCodeAnalyzer:
    """Functions and methods with no callers and no other reference.

    A function node always has two structural incoming edges (`contains` and
    `defines` from its file or class), so the old `in_degree == 1` test could
    never match. Only incoming `calls` edges count as callers, and a name that
    appears anywhere else in the source (a callback, `__all__`, an import, a
    registry dict) counts as used.
    """

    def __init__(
        self,
        repository_index
    ):

        self.repository_index = (
            repository_index
        )

        self.graph = (
            repository_index.graph
        )

        self._corpus = "\n".join(
            getattr(f, "source_code", "") or "" for f in getattr(repository_index, "parsed_files", [])
        )

    def _callers(self, node):
        return sum(
            1
            for _, _, data in self.graph.in_edges(node, data=True)
            if data.get("relation") == "calls"
        )

    def _referenced_elsewhere(self, name):
        # The definition itself accounts for one occurrence
        if not self._corpus or not name:
            return True
        return len(re.findall(rf"\b{re.escape(name)}\b", self._corpus)) > 1

    def _skip(self, name, data, file_path):
        if name.startswith("__") and name.endswith("__"):
            return True  # dunder methods are called by Python itself
        if data.get("decorators"):
            return True  # routes, fixtures, properties, CLI commands...
        if name in _ENTRY_NAMES:
            return True
        path = (file_path or "").replace("\\", "/")
        if name.startswith("test") or "/tests/" in f"/{path}" or path.split("/")[-1].startswith("test_"):
            return True  # collected and run by the test runner
        return False

    def _find(self, node_type):
        findings = []
        for node, data in self.graph.nodes(data=True):
            if data.get("type") != node_type:
                continue
            name = data.get("name") or node.split("::")[-1]
            file_path = data.get("file_path") or node.split("::")[0]
            if self._skip(name, data, file_path):
                continue
            if self._callers(node) > 0 or self._referenced_elsewhere(name):
                continue

            confidence = "high" if name.startswith("_") else "medium"
            reason = "No callers and no other reference in the repository"
            if node_type == "method":
                class_node = node.rsplit("::", 1)[0]
                has_bases = any(
                    d.get("relation") == "inherits" for _, _, d in self.graph.out_edges(class_node, data=True)
                ) if class_node in self.graph else False
                if has_bases:
                    confidence = "low"
                    reason = "No callers; its class inherits, so it may override a method called by the base class"
            elif confidence == "medium":
                reason = "No callers inside the repository; public, so importers outside it may still use it"

            findings.append(
                DeadCodeFinding(
                    node_id=node,
                    node_type=node_type,
                    file_path=file_path,
                    reason=reason,
                    name=name,
                    start_line=data.get("start_line"),
                    end_line=data.get("end_line"),
                    confidence=confidence,
                )
            )
        return findings

    def find_unused_functions(
        self
    ):
        return self._find("function")

    def find_unused_methods(
        self
    ):
        return self._find("method")

    def analyze(
        self
    ):

        order = {"high": 0, "medium": 1, "low": 2}
        findings = self.find_unused_functions() + self.find_unused_methods()
        return sorted(findings, key=lambda f: (order.get(f.confidence, 3), f.file_path, f.start_line or 0))
