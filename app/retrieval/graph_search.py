"""Graph search module."""
# pyrefly: ignore [missing-import]
import networkx as nx

class GraphSearcher:
    def __init__(self,graph:nx.DiGraph):
        self.graph = graph
    
    def get_neighbors(self,node_name:str, depth:int =1):
        if node_name not in self.graph:
            return []
        visited = set()
        current = {node_name}

        for _ in range(depth):
            next_nodes = set()

            for node in current:
                neighbors = (self.graph.successors(node))

                for neighbor in neighbors:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        next_nodes.add(neighbor)
            current = next_nodes
        return list(visited)
        