"""Graph visualizer module."""

class GraphVisualizer:
    def export_json(self, graph):
        nodes = []
        for node_id, data in graph.nodes(data=True):
            nodes.append({
                "id": node_id,
                "label": data.get("name", str(node_id).split("::")[-1]),
                "type": data.get("type", "unknown")
            })
            
        edges = []
        for u, v, data in graph.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "relation": data.get("relation", "unknown")
            })
            
        return {
            "nodes": nodes,
            "edges": edges
        }
