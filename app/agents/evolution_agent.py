from app.storage.repository_registry import repository_registry
from app.evolution.diff_analyzer import RepositoryDiffAnalyzer
from app.evolution.report_generator import EvolutionReportGenerator
from app.chat.llm_provider import LLMProvider

def evolution_node(state):
    old_repo_name = state.get("old_repository")
    new_repo_name = state.get("new_repository")

    old_repo = repository_registry.get(old_repo_name)
    new_repo = repository_registry.get(new_repo_name)

    if not old_repo or not new_repo:
        state["answer"] = "One or both repositories are not indexed. Please index them first."
        return state

    analyzer = RepositoryDiffAnalyzer()
    report = analyzer.analyze(old_repo, new_repo)

    generator = EvolutionReportGenerator()
    raw_report = generator.generate(report)

    llm = LLMProvider()
    prompt = f"""
You are a Staff Engineer presenting a changelog. 
I have a raw diff report showing classes, functions, and files added or removed between two versions of a repository.
Format it into a clean, human-readable summary. Do not add anything that isn't in the raw report.

Raw Report:
{raw_report}
"""
    
    state["answer"] = llm.generate(prompt).strip()

    return state
