from pathlib import Path
from app.parsers.language_detector import detect_languages
from app.indexing.models.repository_file import RepositoryFile


def build_repository_metadata(files):
    repository_files = []

    for file in files:
        repository_files.append(
            RepositoryFile(
                path = str(file),
                extension = file.suffix,
                language = detect_languages(file),
                size = file.stat().st_size
            )
        )
    return repository_files