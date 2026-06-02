"""Context builder module."""
class ContextBuilder:
    def build(self,retrieval_result):
        sections = []

        for result in retrieval_result.get("semantic_results", []):
            payload = result.payload
            content = payload.get('content', '')
            if content:
                content = content[:1500] + "\n...[truncated]" if len(content) > 1500 else content

            sections.append(
                f"""
ENTITY TYPE:
{payload.get('entity_type')}

NAME:
{payload.get('name')}

FILE:
{payload.get('file_path')}

CODE:
{content}
"""
            )

        for g in retrieval_result.get("graph_context", []):
            metadata = g.get("metadata", {})
            content = metadata.get('content', 'unknown')
            if content and content != 'unknown':
                content = content[:1000] + "\n...[truncated]" if len(content) > 1000 else content

            sections.append(
                f"""
RELATED ENTITY (from graph):
NAME: {g.get('node')}
FILE: {metadata.get('file_path', 'unknown')}
CODE: {content}
"""
            )

        return "\n\n".join(sections)