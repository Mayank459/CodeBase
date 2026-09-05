from app.indexing.models.entity_extractor import EntityExtractor
from app.parsers.python.extractor import extract_python_file
from app.embeddings.embedding_service import EmbeddingService
from app.storage.vector_store import create_collection, store_entities

code = """
import os

JWT_SECRET = 'secret'

class MyClass:
    def my_method(self):
        pass

def my_function():
    pass
"""

print("Extracting entities...")
parsed = extract_python_file("test_qdrant.py", code)
extractor = EntityExtractor()
entities = extractor.extract_entities([parsed])
print(f"Extracted {len(entities)} entities.")

print("Embedding entities...")
service = EmbeddingService()
embedded_entities = service.embed_entities(entities)
print(f"Embedded {len(embedded_entities)} entities.")

print("Connecting to Qdrant and storing entities...")
create_collection()
store_entities("test_qdrant", entities, embedded_entities)

print("Successfully stored entities in Qdrant!")
