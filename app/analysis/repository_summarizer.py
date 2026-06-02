"""Repository summarizer module."""
from app.analysis.architecture_analyzer import ArchitectureAnalyzer
from app.indexing.models.code_entity import CodeEntity


class RepositorySummarizer:
    """
    Generates a lightweight summary entity for the repository during indexing.
    Deliberately avoids LLM calls so the indexing pipeline stays fast.
    A richer LLM-powered summary can be requested later via the chat interface.
    """

    def generate_summary(self, repository_index, start_id: int) -> CodeEntity:
        analyzer = ArchitectureAnalyzer(repository_index)
        stats = analyzer.analyze()

        top_components = "\n".join(
            f"- {node[0].split('::')[-1]}"
            for node in stats["top_nodes"][:15]
        )

        file_count = len(repository_index.parsed_files)
        node_count = stats["graph_nodes"]
        edge_count = stats["graph_edges"]

        content = (
            f"Repository: {repository_index.repository_name}\n"
            f"Files: {file_count} | Graph nodes: {node_count} | Graph edges: {edge_count}\n\n"
            f"Top components:\n{top_components}"
        )

        return CodeEntity(
            id=start_id,
            graph_node_id=repository_index.repository_name,
            entity_type="repository_summary",
            name=f"{repository_index.repository_name} Summary",
            file_path="repository_root",
            content=content.strip()
        )
