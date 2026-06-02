from app.parsers.python.extractor import (
    extract_python_file
)

code = """
def login():
    pass

def logout():
    pass
"""

result = extract_python_file(
    "auth.py",
    code
)

print(result)