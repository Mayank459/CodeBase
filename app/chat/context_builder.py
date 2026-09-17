"""Context builder module with context budgeting and token compression."""
from typing import Dict, Any, List


class ContextBuilder:
    """
    Builds structured, budgeted LLM prompt context from hybrid retrieval results.
    Enforces token/character budgets to minimize TTFT and avoid context bloat.
    """

    def __init__(self, max_total_chars: int = 14000, max_snippet_chars: int = 1200):
        self.max_total_chars = max_total_chars
        self.max_snippet_chars = max_snippet_chars

    def _compress_snippet(self, code: str) -> str:
        """Compress code by stripping excessive blank lines and bounding length."""
        if not code:
            return ""
        lines = [line.rstrip() for line in code.splitlines()]
        # Remove consecutive blank lines
        filtered = []
        last_blank = False
        for line in lines:
            if not line:
                if not last_blank:
                    filtered.append("")
                    last_blank = True
            else:
                filtered.append(line)
                last_blank = False

        compressed = "\n".join(filtered)
        if len(compressed) > self.max_snippet_chars:
            return compressed[:self.max_snippet_chars] + "\n...[truncated for context budget]"
        return compressed

    def build(self, retrieval_result: Dict[str, Any]) -> str:
        sections: List[str] = []
        current_chars = 0

        # 1. Primary Fused / Semantic Results
        primary_items = retrieval_result.get("results") or retrieval_result.get("semantic_results", [])
        for item in primary_items:
            payload = getattr(item, "payload", {}) if not isinstance(item, dict) else item.get("payload", item)
            score = getattr(item, "score", 0.0)

            content = self._compress_snippet(payload.get("content", "") or payload.get("code", ""))
            entry = (
                f"### PRIMARY CODE ENTITY (Relevance Score: {score:.3f})\n"
                f"Type: {payload.get('entity_type', 'symbol')}\n"
                f"Name: {payload.get('name', 'unknown')}\n"
                f"File: {payload.get('file_path', 'unknown')}\n"
                f"```python\n{content}\n```"
            )

            if current_chars + len(entry) > self.max_total_chars:
                break
            sections.append(entry)
            current_chars += len(entry)

        # 2. Graph Expansion Context (Callers, Callees, Inherits, Definitions)
        graph_context = retrieval_result.get("graph_context", [])
        for g in graph_context:
            metadata = g.get("metadata", {})
            node_id = g.get("node", "")
            relationship = g.get("relationship", "related")

            code = metadata.get("content", "") or metadata.get("code", "")
            compressed_code = self._compress_snippet(code)

            entry = (
                f"### GRAPH RELATION ({relationship.upper()} [Level {g.get('level', 1)}])\n"
                f"Entity Node: {node_id}\n"
                f"File: {metadata.get('file_path', 'unknown')}\n"
            )
            if compressed_code:
                entry += f"```python\n{compressed_code}\n```"

            if current_chars + len(entry) > self.max_total_chars:
                break
            sections.append(entry)
            current_chars += len(entry)

        return "\n\n".join(sections)