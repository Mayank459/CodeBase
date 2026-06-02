from app.indexing.index_builder import IndexBuilder
from app.parsers.python.extractor import extract_python_file

code = """
import os

class MyClass:
    def method(self):
        pass
"""

parsed = extract_python_file("test.py", code)

builder = IndexBuilder()

repo_index = builder.build(
    repository_name="test_repo",
    parsed_files=[parsed]
)

print("Graph:", repo_index.graph)
print("Graph Nodes:", repo_index.graph.nodes)
print("Parsed Files:", repo_index.parsed_files)
