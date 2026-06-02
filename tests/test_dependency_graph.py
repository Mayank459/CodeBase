from app.parsers.python.extractor import extract_python_file
from app.graph.dependency_builder import DependencyGraphBuilder

code1 = """
from auth import AuthService
"""

code2 = """
import jwt
"""

parsed1 = extract_python_file("main.py", code1)
parsed2 = extract_python_file("auth.py", code2)

builder = DependencyGraphBuilder()
builder.add_file(parsed1)
builder.add_file(parsed2)

graph = builder.get_graph()

print(graph.nodes(data=True))
print(graph.edges(data=True))