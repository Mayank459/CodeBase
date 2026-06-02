import networkx as nx


class DependencyGraphBuilder:

    def __init__(self):

        self.graph = nx.DiGraph()
    
    def add_file(self,parsed_file):
        file_node = parsed_file.file_path
        self.graph.add_node(file_node,type="file")

        for imp in parsed_file.imports:
            dependency = imp.module
            self.graph.add_node(dependency,type="dependency")

            self.graph.add_edge(
                file_node,
                dependency,
                relation="imports"
            )
    def get_graph(self):
        return self.graph

        