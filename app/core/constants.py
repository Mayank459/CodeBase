"""Core constants."""

MAX_RETRIEVED_CHUNKS = 10
# Runtime embedding backend is Cohere embed-english-light-v3.0 (384-dim),
# see app/embeddings/embedding_service.py
DEFAULT_EMBEDDING_MODEL = "embed-english-light-v3.0"
# Runtime LLM is Gemini 3.6 Flash, see app/chat/llm_provider.py
DEFAULT_LLM_MODEL = "gemini-3.6-flash"
SUPPORTED_FILE_EXTENSIONS = {".py"}
