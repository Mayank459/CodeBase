"""Dead code agent module."""
from dataclasses import asdict

from app.dead_code.analyzer import DeadCodeAnalyzer
from app.dead_code.report_generator import DeadCodeReportGenerator
from app.storage.repository_registry import repository_registry


def dead_code_node(
    state
):
    repository = (
        repository_registry.get(
            state[
                "repository_name"
            ]
        )
    )

    if not repository:
        state["answer"] = "Repository not indexed. Please index it first."
        state["dead_code"] = []
        return state

    findings = DeadCodeAnalyzer(repository).analyze()

    # The report is built from the findings directly: an LLM summary of the
    # list added latency and could describe symbols that were never in it.
    state["answer"] = DeadCodeReportGenerator().generate(findings)
    state["dead_code"] = [asdict(f) for f in findings]

    return state
