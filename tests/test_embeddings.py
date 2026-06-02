from app.embeddings.embedding_service import EmbeddingService

service = EmbeddingService()

vector = service.embed_text(
    "authentication service"
)

print(len(vector))
