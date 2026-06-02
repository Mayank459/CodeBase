"""Architecture analyzer module."""
class ArchitectureAnalyzer:

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
    
    def get_top_nodes(self,limit=20):
        degrees = []

        for node in self.graph.nodes():

            degree = (
                self.graph.degree(node)
            )

            degrees.append(
                (
                    node,
                    degree
                )
            )

        degrees.sort(
            key=lambda x: x[1],
            reverse=True
        )

        return degrees[:limit]

    def discover_modules(self):
        modules = {}

        for parsed_file in (
            self.repository_index
            .parsed_files
        ):

            modules[
                parsed_file.file_path
            ] = {

                "classes":
                    len(
                        parsed_file.classes
                    ),

                "functions":
                    len(
                        parsed_file.functions
                    ),

                "variables":
                    len(
                        parsed_file.variables
                    )
            }

        return modules

    def analyze(self):
        return {
            "top_nodes":
                self.get_top_nodes(),

            "modules":
                self.discover_modules(),

            "graph_nodes":
                self.graph.number_of_nodes(),

            "graph_edges":
                self.graph.number_of_edges()
        }