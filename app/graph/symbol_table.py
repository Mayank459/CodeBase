"""Symbol table module."""
from collections import defaultdict


class SymbolTable:

    # Ambiguous names (e.g. many `get` methods) are left unresolved rather than
    # guessed; above this many candidates the call becomes an external node.
    MAX_CANDIDATES = 3

    def __init__(self):

        # name -> graph node (last definition wins; kept for existing callers)
        self.functions = {}

        self.classes = {}

        self.methods = {}

        # name -> every graph node defining it, so a call is not linked to an
        # arbitrary one of several same-named definitions
        self.by_name = defaultdict(list)

        self.node_ids = set()

    def _add(self, name, graph_node):
        self.by_name[name].append(graph_node)
        self.node_ids.add(graph_node)

    def register_function(
        self,
        name,
        graph_node
    ):
        self.functions[name] = graph_node
        self._add(name, graph_node)

    def register_class(
        self,
        name,
        graph_node
    ):
        self.classes[name] = graph_node
        self._add(name, graph_node)

    def register_method(
        self,
        name,
        graph_node
    ):
        self.methods[name] = graph_node
        self._add(name, graph_node)

    def resolve_call(self, call_name, caller_file=None, caller_class=None):
        """Graph nodes a call expression most likely targets (possibly several)."""
        raw = (call_name or "").strip()
        if not raw:
            return []
        if raw.startswith(("self.", "cls.")):
            member = raw.split(".", 1)[1]
            if caller_class and "." not in member:
                own = f"{caller_class}::{member}"
                if own in self.node_ids:
                    return [own]
        last = raw.split(".")[-1].split("(")[0]
        candidates = self.by_name.get(last, [])
        if not candidates:
            return []
        if caller_file:
            local = [c for c in candidates if c.startswith(f"{caller_file}::")]
            if local:
                candidates = local
        if len(candidates) > self.MAX_CANDIDATES:
            return []
        resolved = list(candidates)
        # Calling a class runs its constructor
        class_nodes = set(self.classes.values())
        for c in candidates:
            init = f"{c}::__init__"
            if c in class_nodes and init in self.node_ids:
                resolved.append(init)
        return resolved
