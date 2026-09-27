"""Graph builder module supporting typed MultiDiGraph with explicit edge semantics."""

import networkx as nx
from app.graph.graph_types import NodeType, EdgeType


class RepositoryGraphBuilder:
    def __init__(self, symbol_table):
        self.graph = nx.MultiDiGraph()
        self.symbol_table = symbol_table

    def add_parsed_file(self, parsed_file):
        file_node = parsed_file.file_path
        self.graph.add_node(file_node, type=NodeType.FILE.value, path=file_node)

        # -----------------------------
        # Imports (External & Internal)
        # -----------------------------
        for imp in parsed_file.imports:
            import_node = imp.module
            self.graph.add_node(import_node, type=NodeType.IMPORT.value, module=import_node)
            self.graph.add_edge(
                file_node,
                import_node,
                key=f"{file_node}->import->{import_node}",
                relation=EdgeType.IMPORTS.value,
                edge_type=EdgeType.IMPORTS.value
            )

        # -----------------------------
        # Variables
        # -----------------------------
        for variable in parsed_file.variables:
            variable_node = f"{file_node}::{variable.name}"
            self.graph.add_node(
                variable_node,
                type=NodeType.VARIABLE.value,
                name=variable.name,
                file_path=file_node
            )
            self.graph.add_edge(
                file_node,
                variable_node,
                key=f"{file_node}->contains->{variable_node}",
                relation=EdgeType.CONTAINS.value,
                edge_type=EdgeType.CONTAINS.value
            )
            self.graph.add_edge(
                file_node,
                variable_node,
                key=f"{file_node}->defines->{variable_node}",
                relation=EdgeType.DEFINES.value,
                edge_type=EdgeType.DEFINES.value
            )

        # -----------------------------
        # Functions
        # -----------------------------
        for function in parsed_file.functions:
            function_node = f"{file_node}::{function.name}"
            self.graph.add_node(
                function_node,
                type=NodeType.FUNCTION.value,
                name=function.name,
                file_path=file_node,
                start_line=function.start_line,
                end_line=function.end_line,
                decorators=getattr(function, "decorators", [])
            )
            self.graph.add_edge(
                file_node,
                function_node,
                key=f"{file_node}->contains->{function_node}",
                relation=EdgeType.CONTAINS.value,
                edge_type=EdgeType.CONTAINS.value
            )
            self.graph.add_edge(
                file_node,
                function_node,
                key=f"{file_node}->defines->{function_node}",
                relation=EdgeType.DEFINES.value,
                edge_type=EdgeType.DEFINES.value
            )

            self._add_calls(function_node, function.calls, file_node)

        # -----------------------------
        # Classes & Methods + Inheritance
        # -----------------------------
        for cls in parsed_file.classes:
            class_node = f"{file_node}::{cls.name}"
            self.graph.add_node(
                class_node,
                type=NodeType.CLASS.value,
                name=cls.name,
                file_path=file_node,
                start_line=cls.start_line,
                end_line=cls.end_line
            )
            self.graph.add_edge(
                file_node,
                class_node,
                key=f"{file_node}->contains->{class_node}",
                relation=EdgeType.CONTAINS.value,
                edge_type=EdgeType.CONTAINS.value
            )
            self.graph.add_edge(
                file_node,
                class_node,
                key=f"{file_node}->defines->{class_node}",
                relation=EdgeType.DEFINES.value,
                edge_type=EdgeType.DEFINES.value
            )

            # Inheritance edges
            for base in getattr(cls, "bases", []):
                resolved_base = self.symbol_table.classes.get(base)
                if resolved_base:
                    self.graph.add_edge(
                        class_node,
                        resolved_base,
                        key=f"{class_node}->inherits->{resolved_base}",
                        relation=EdgeType.INHERITS.value,
                        edge_type=EdgeType.INHERITS.value
                    )
                else:
                    base_node = f"CLASS::{base}"
                    self.graph.add_node(base_node, type=NodeType.CLASS.value, name=base)
                    self.graph.add_edge(
                        class_node,
                        base_node,
                        key=f"{class_node}->inherits->{base_node}",
                        relation=EdgeType.INHERITS.value,
                        edge_type=EdgeType.INHERITS.value
                    )

            # Methods
            for method in cls.methods:
                method_node = f"{class_node}::{method.name}"
                self.graph.add_node(
                    method_node,
                    type="method",
                    name=method.name,
                    class_name=cls.name,
                    file_path=file_node,
                    start_line=method.start_line,
                    end_line=method.end_line,
                    decorators=getattr(method, "decorators", [])
                )
                self.graph.add_edge(
                    class_node,
                    method_node,
                    key=f"{class_node}->contains->{method_node}",
                    relation=EdgeType.CONTAINS.value,
                    edge_type=EdgeType.CONTAINS.value
                )
                self.graph.add_edge(
                    class_node,
                    method_node,
                    key=f"{class_node}->defines->{method_node}",
                    relation=EdgeType.DEFINES.value,
                    edge_type=EdgeType.DEFINES.value
                )

                self._add_calls(method_node, method.calls, file_node, caller_class=class_node)

    def _add_calls(self, caller_node, calls, file_node, caller_class=None):
        for call in calls:
            targets = self.symbol_table.resolve_call(call.name, caller_file=file_node, caller_class=caller_class)
            targets = [t for t in targets if t != caller_node]  # direct recursion is not a caller
            if targets:
                for resolved in targets:
                    self.graph.add_edge(
                        caller_node,
                        resolved,
                        key=f"{caller_node}->calls->{resolved}",
                        relation=EdgeType.CALLS.value,
                        edge_type=EdgeType.CALLS.value,
                        is_external=False
                    )
            else:
                call_node = f"CALL::{call.name}"
                self.graph.add_node(call_node, type=NodeType.CALL.value, name=call.name)
                self.graph.add_edge(
                    caller_node,
                    call_node,
                    key=f"{caller_node}->calls->{call_node}",
                    relation=EdgeType.CALLS.value,
                    edge_type=EdgeType.CALLS.value,
                    is_external=True
                )

    def get_graph(self):
        return self.graph