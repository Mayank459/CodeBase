from app.parsers.python.parser import build_python_parser

parser = build_python_parser()

code = """
import jwt

JWT_SECRET = "abc"

class AuthService:

    def login(self):
        pass

def helper():
    pass
"""

tree = parser.parse(bytes(code,"utf8"))
root = tree.root_node

def walk(node,depth = 0):
    print(" "*depth,node.type)

    for child in node.children:
        walk(child,depth + 2)

walk(root)