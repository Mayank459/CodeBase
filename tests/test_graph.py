from app.parsers.python.extractor import (
    extract_python_file
)

from app.graph.builder import (
    RepositoryGraphBuilder
)
from app.graph.resolver import SymbolResolver

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

# RepositoryGraphBuilder now requires a resolved symbol table
resolver = SymbolResolver()
symbol_table = resolver.build([parsed])

builder = RepositoryGraphBuilder(symbol_table)

builder.add_parsed_file(
    parsed
)

graph = builder.get_graph()

print(graph.nodes(data=True))
print(graph.edges(data=True))