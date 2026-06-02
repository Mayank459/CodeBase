from pprint import pprint

from app.parsers.python.extractor import (
    extract_python_file
)

code = """
import jwt
from fastapi import FastAPI

JWT_SECRET = "abc"

class AuthService:

    def login(self):
        pass

    def logout(self):
        pass


def helper():
    pass
"""

result = extract_python_file(
    "auth.py",
    code
)

pprint(result)