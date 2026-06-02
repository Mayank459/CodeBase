from pathlib import Path

# Base directory is 3 levels up from app/core/config.py (CodeBase directory)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Define the storage path for downloaded repositories
REPOSITORY_STORAGE = BASE_DIR / "data" / "repositories"

# Ensure the storage directory exists
REPOSITORY_STORAGE.mkdir(parents=True, exist_ok=True)
