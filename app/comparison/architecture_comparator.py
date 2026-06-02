class ArchitectureComparator:
    def compare(self, repo_a, repo_b):
        nodes_a = repo_a.graph.number_of_nodes()
        edges_a = repo_a.graph.number_of_edges()
        density_a = edges_a / nodes_a if nodes_a > 0 else 0
        
        nodes_b = repo_b.graph.number_of_nodes()
        edges_b = repo_b.graph.number_of_edges()
        density_b = edges_b / nodes_b if nodes_b > 0 else 0
        
        comparison = "### Architecture Comparison\n\n"
        comparison += f"**{repo_a.repository_name}**:\n"
        comparison += f"- Nodes: {nodes_a}\n- Edges: {edges_a}\n- Coupling Density: {density_a:.2f}\n\n"
        
        comparison += f"**{repo_b.repository_name}**:\n"
        comparison += f"- Nodes: {nodes_b}\n- Edges: {edges_b}\n- Coupling Density: {density_b:.2f}\n\n"
        
        if density_a > density_b:
            comparison += f"**Conclusion:** `{repo_a.repository_name}` is more tightly coupled than `{repo_b.repository_name}`."
        elif density_b > density_a:
            comparison += f"**Conclusion:** `{repo_b.repository_name}` is more tightly coupled than `{repo_a.repository_name}`."
        else:
            comparison += "**Conclusion:** Both repositories have identical architectural coupling."
            
        return comparison
