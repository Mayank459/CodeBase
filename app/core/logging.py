from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

REPOSITORY_STORAGE = BASE_DIR / "data" / "repositories"

REPOSITORY_STORAGE.mkdir(parents=True, exist_ok=True)