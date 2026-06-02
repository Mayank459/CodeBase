"""Insight analyzer module."""
import networkx as nx

class InsightAnalyzer:
    def __init__(self, repository_index):
        self.graph = repository_index.graph

    def most_connected_nodes(self, limit=10):
        """Returns the nodes with the highest total degree (in + out edges)."""
        degrees = sorted(self.graph.degree, key=lambda x: x[1], reverse=True)
        
        results = []
        for node, deg in degrees[:limit]:
            results.append({
                "name": node,
                "connections": deg
            })
        return results

    def most_depended_upon(self, limit=10):
        """Returns nodes with the highest in-degree (others depend on these)."""
        in_degrees = sorted(self.graph.in_degree, key=lambda x: x[1], reverse=True)
        
        results = []
        for node, deg in in_degrees[:limit]:
            results.append({
                "name": node,
                "incoming_dependencies": deg
            })
        return results

    def central_files(self, limit=5):
        """Returns files with the highest overall connectivity."""
        files = [n for n, attr in self.graph.nodes(data=True) if attr.get("type") == "file"]
        file_degrees = [(f, self.graph.degree(f)) for f in files]
        file_degrees.sort(key=lambda x: x[1], reverse=True)
        
        results = []
        for node, deg in file_degrees[:limit]:
            results.append({
                "file": node,
                "connections": deg
            })
        return results

    def critical_paths(self):
        """Identify long execution or structural chains in the graph."""
        # For a full critical path analysis, we can look for the longest paths in the DAG (if acyclic)
        # We will keep it simple here by returning a placeholder or a basic path traversal
        return [{"path": "Critical path analysis requires DAG formulation."}]
