from app.indexing.models.entity_extractor import EntityExtractor
from app.parsers.python.extractor import extract_python_file

code = """
import os

JWT_SECRET = 'secret'

class MyClass:
    def my_method(self):
        pass

def my_function():
    pass
"""

parsed = extract_python_file("test_entities.py", code)

extractor = EntityExtractor()

entities = extractor.extract_entities(
    [parsed]
)

for entity in entities:
    print(f"[{entity.entity_type}] {entity.name}")