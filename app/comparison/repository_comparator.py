"""Repository comparator module."""
from app.comparison.models import (
    RepositoryComparison
)


class RepositoryComparator:

    def summarize(
        self,
        repository_index
    ):

        class_count = 0
        function_count = 0
        method_count = 0

        for parsed_file in (
            repository_index.parsed_files
        ):

            class_count += len(
                parsed_file.classes
            )

            function_count += len(
                parsed_file.functions
            )

            for cls in (
                parsed_file.classes
            ):

                method_count += len(
                    cls.methods
                )

        return RepositoryComparison(
            repository_name=
                repository_index
                .repository_name,

            classes=
                class_count,

            functions=
                function_count,

            methods=
                method_count,

            graph_nodes=
                repository_index.graph
                .number_of_nodes(),

            graph_edges=
                repository_index.graph
                .number_of_edges()
        )