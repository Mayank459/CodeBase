"""Architecture agent module."""
from app.storage.repository_registry import repository_registry
from app.analysis.architecture_analyzer import ArchitectureAnalyzer
from app.chat.llm_provider import LLMProvider
from app.streaming.stream_manager import stream
from app.prompts.templates import ARCHITECTURE_PROMPT


def architecture_node(state):
    stream.emit("progress", "Scanning repository...")

    repository = repository_registry.get(state["repository_name"])

    if not repository:
        state["answer"] = "Repository not indexed. Please index it first."
        return state

    stream.emit("progress", "Building graph...")
    analyzer = ArchitectureAnalyzer(repository)
    analysis = analyzer.analyze()

    stream.emit("complete", "Architecture analysis complete.")

    llm = LLMProvider()

    stream.emit("progress", "Generating answer...")
    prompt = ARCHITECTURE_PROMPT.format(
        question=state["question"],
        analysis=analysis
    )
    state["answer"] = llm.generate_stream(prompt)

    return state