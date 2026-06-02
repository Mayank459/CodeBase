"""Dependency analyzer module."""
import networkx as nx

class DependencyAnalyzer:
    def analyze(self, repository_index):
        graph = repository_index.graph
        
        # Identify God Classes (High out-degree/in-degree)
        in_degrees = dict(graph.in_degree())
        out_degrees = dict(graph.out_degree())
        
        total_degrees = {node: in_degrees.get(node, 0) + out_degrees.get(node, 0) for node in graph.nodes()}
        # Get top 5 most connected nodes
        god_nodes = sorted(total_degrees.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Identify potential circular dependencies (triangles or direct cycles)
        cycles = []
        try:
            # We restrict search length to 3 to prevent hanging on massive graphs
            for cycle in nx.simple_cycles(graph, length_bound=3):
                if len(cycle) > 1:
                    cycles.append(cycle)
                    if len(cycles) >= 5:
                        break
        except Exception:
            pass
            
        return {
            "most_connected_nodes": [{"node": n, "connections": d} for n, d in god_nodes],
            "circular_dependencies": cycles
        }
