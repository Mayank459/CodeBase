"""Graph builder module."""

import networkx as nx

class RepositoryGraphBuilder:
    def __init__(self, symbol_table):
        self.graph = nx.DiGraph()
        self.symbol_table = symbol_table

    def add_parsed_file(self,parsed_file):
        file_node = parsed_file.file_path
        self.graph.add_node(file_node,type = "file")

        ## IMPORTS
        for imp in parsed_file.imports:
            import_node = imp.module

            self.graph.add_node(import_node,type ="import")
            self.graph.add_edge(file_node,import_node,relation = "imports")

        ## Variables
        for variable in parsed_file.variables:

            variable_node = (
                f"{file_node}::{variable.name}"
            )

            self.graph.add_node(
                variable_node,
                type="variable",
                name=variable.name
            )

            self.graph.add_edge(
                file_node,
                variable_node,
                relation="contains"
            )

        ## FUNCTIONS
        for function in parsed_file.functions:
            function_node = (
                f"{file_node}::{function.name}"
            )

            self.graph.add_node(
                function_node,
                type="function",
                name=function.name
            )

            self.graph.add_edge(
                file_node,
                function_node,
                relation="contains"
            )

            for call in function.calls:
                resolved = (
                    self.symbol_table.functions.get(
                        call.name
                    )
                )

                if resolved:
                    self.graph.add_edge(
                        function_node,
                        resolved,
                        relation="calls"
                    )
                else:
                    call_node = f"CALL::{call.name}"
                    self.graph.add_node(call_node, type="call")
                    self.graph.add_edge(function_node, call_node, relation="calls")
        
        ## CLASSES
        for cls in parsed_file.classes:

            class_node = (
                f"{file_node}::{cls.name}"
            )

            self.graph.add_node(
                class_node,
                type="class",
                name=cls.name
            )

            self.graph.add_edge(
                file_node,
                class_node,
                relation="contains"
            )
            ## METHODS
            for method in cls.methods:

                method_node = (
                    f"{class_node}::{method.name}"
                )

                self.graph.add_node(
                    method_node,
                    type="method",
                    name=method.name
                )

                self.graph.add_edge(
                    class_node,
                    method_node,
                    relation="contains"
                )

                for call in method.calls:
                    resolved = (
                        self.symbol_table.methods.get(
                            call.name
                        ) or self.symbol_table.functions.get(
                            call.name
                        )
                    )

                    if resolved:
                        self.graph.add_edge(
                            method_node,
                            resolved,
                            relation="calls"
                        )
                    else:
                        call_node = f"CALL::{call.name}"
                        self.graph.add_node(call_node, type="call")
                        self.graph.add_edge(method_node, call_node, relation="calls")

    def get_graph(self):

        return self.graph