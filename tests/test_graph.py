from app.parsers.python.extractor import (
    extract_python_file
)

from app.graph.builder import (
    RepositoryGraphBuilder
)

code = """
import jwt

JWT_SECRET = "abc"

class AuthService:

    def login(self):
        pass

def helper():
    pass
"""

parsed = extract_python_file(
    "auth.py",
    code
)

builder = RepositoryGraphBuilder()

builder.add_parsed_file(
    parsed
)

graph = builder.get_graph()

print(graph.nodes(data=True))
print(graph.edges(data=True))