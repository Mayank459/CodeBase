"""Repository documentation generator."""
from app.documentation.class_docs import ClassDocumentationGenerator
from app.documentation.function_docs import FunctionDocumentationGenerator


class RepositoryDocumentationGenerator:

    def generate(self, repository_index):
        class_gen = ClassDocumentationGenerator()
        func_gen = FunctionDocumentationGenerator()

        sections = []
        sections.append(f"# Repository: `{repository_index.repository_name}`\n")
        sections.append(
            f"- **Total files parsed:** {len(repository_index.parsed_files)}\n"
            f"- **Graph nodes:** {repository_index.graph.number_of_nodes()}\n"
            f"- **Graph edges:** {repository_index.graph.number_of_edges()}\n"
        )

        for parsed_file in repository_index.parsed_files:
            file_header = f"\n---\n## File: `{parsed_file.file_path}`\n"
            file_sections = []

            for cls in parsed_file.classes:
                file_sections.append(
                    f"### Class: `{cls.name}` (lines {cls.start_line}–{cls.end_line})\n"
                    f"```python\n{cls.code[:800]}{'...' if len(cls.code) > 800 else ''}\n```\n"
                )
                for method in cls.methods:
                    file_sections.append(
                        f"#### Method: `{cls.name}.{method.name}` (lines {method.start_line}–{method.end_line})\n"
                        f"```python\n{method.code[:400]}{'...' if len(method.code) > 400 else ''}\n```\n"
                    )

            for func in parsed_file.functions:
                file_sections.append(
                    f"### Function: `{func.name}` (lines {func.start_line}–{func.end_line})\n"
                    f"```python\n{func.code[:600]}{'...' if len(func.code) > 600 else ''}\n```\n"
                )

            if file_sections:
                sections.append(file_header)
                sections.extend(file_sections)

        return "\n".join(sections)
