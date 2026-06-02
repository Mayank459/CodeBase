"""Function documentation generator."""

class FunctionDocumentationGenerator:

    def generate(
        self,
        entity
    ):

        return f"""
# {entity.name}

Type:
{entity.entity_type}

File:
{entity.file_path}

Code:

{entity.content}
"""
