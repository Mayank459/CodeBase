from app.graph.builder import RepositoryGraphBuilder

from app.indexing.models.repository_index import (
    RepositoryIndex
)
from app.graph.resolver import SymbolResolver

class IndexBuilder:

    def build(
        self,
        repository_name,
        parsed_files
    ):

        resolver = SymbolResolver()
        symbol_table = resolver.build(parsed_files)

        graph_builder = (
            RepositoryGraphBuilder(symbol_table)
        )

        for parsed_file in parsed_files:

            graph_builder.add_parsed_file(
                parsed_file
            )

        return RepositoryIndex(
            repository_name=repository_name,
            parsed_files=parsed_files,
            graph=graph_builder.get_graph()
        )