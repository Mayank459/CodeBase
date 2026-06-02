from app.storage.search import search
from app.parsers.python.extractor import extract_python_file
from app.indexing.models.entity_extractor import EntityExtractor
from app.embeddings.embedding_service import EmbeddingService
from app.storage.vector_store import create_collection, store_entities

# Populate Qdrant with some relevant entities just in case they aren't there
code = """
import jwt

JWT_SECRET = 'secret'

class AuthService:
    def login(self):
        pass

def auth_helper():
    pass
"""
parsed = extract_python_file("auth.py", code)
extractor = EntityExtractor()
entities = extractor.extract_entities([parsed])
service = EmbeddingService()
embedded_entities = service.embed_entities(entities)
create_collection()
store_entities(entities, embedded_entities)

print("Running search for: 'authentication service'...")
results = search("authentication service")

for result in results:
    payload = result.payload
    print(f"[{result.score:.4f}] {payload['entity_type']}: {payload['name']}")
