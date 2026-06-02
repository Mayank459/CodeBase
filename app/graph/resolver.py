"""Resolver module."""
from app.graph.symbol_table import (
    SymbolTable
)


class SymbolResolver:

    def build(
        self,
        parsed_files
    ):

        table = SymbolTable()

        for parsed_file in parsed_files:

            file_path = parsed_file.file_path

            for function in parsed_file.functions:

                graph_id = (
                    f"{file_path}"
                    f"::{function.name}"
                )

                table.register_function(
                    function.name,
                    graph_id
                )

            for cls in parsed_file.classes:

                class_id = (
                    f"{file_path}"
                    f"::{cls.name}"
                )

                table.register_class(
                    cls.name,
                    class_id
                )

                for method in cls.methods:

                    method_id = (
                        f"{class_id}"
                        f"::{method.name}"
                    )

                    table.register_method(
                        method.name,
                        method_id
                    )

        return table