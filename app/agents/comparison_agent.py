"""Comparison agent module."""
from app.comparison.repository_comparator import RepositoryComparator
from app.comparison.report_generator import ComparisonReportGenerator
from app.storage.repository_registry import repository_registry

def comparison_node(state):
    repositories = state.get("repositories", [])
    
    comparator = RepositoryComparator()
    comparisons = []

    for repo_name in repositories:
        repo = repository_registry.get(repo_name)
        if repo:
            comparisons.append(comparator.summarize(repo))

    generator = ComparisonReportGenerator()
    state["answer"] = generator.generate(comparisons)

    return state
