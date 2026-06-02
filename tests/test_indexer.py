from app.services.repository_indexer import (
    RepositoryIndexer
)

indexer = RepositoryIndexer()

result = indexer.index_repository(
    "https://github.com/pallets/itsdangerous.git"
    # "https://github.com/tiangolo/fastapi.git"
)

print(result)
