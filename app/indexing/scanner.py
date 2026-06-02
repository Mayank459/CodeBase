from pathlib import Path

# Directories to skip entirely
IGNORE_DIRS = {
    ".git", ".svn", ".hg",
    ".venv", "venv", "env", ".env",
    "__pycache__", ".mypy_cache", ".pytest_cache", ".ruff_cache",
    ".tox", ".eggs", "*.egg-info",
    "node_modules", ".yarn", ".pnpm-store",
    "dist", "build", "out", "target",
    "coverage", ".coverage", "htmlcov",
    "migrations", "alembic",
    ".idea", ".vscode",
    "site-packages",
}

# File extensions that carry no code intelligence value
SKIP_EXTENSIONS = {
    # Data / config noise
    ".lock", ".sum",
    # Binary / media
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2",
    ".ttf", ".eot", ".otf", ".mp4", ".mp3", ".pdf", ".zip", ".tar", ".gz",
    # Compiled
    ".pyc", ".pyo", ".class", ".o", ".so", ".dll", ".exe",
    # Large data formats — only index if small enough
    ".csv", ".parquet", ".pb", ".bin", ".pkl", ".pt", ".pth",
}

# Maximum file size to index (bytes) — skip huge generated/binary files
MAX_FILE_SIZE = 100 * 1024   # 100 KB


def scan_repository(repo_path: str) -> list:
    """
    Return a list of Path objects for all indexable source files under repo_path.
    Applies directory exclusions, extension filtering, and a file-size cap.
    """
    files = []

    for path in Path(repo_path).rglob("*"):
        # Skip ignored directories
        if any(part in IGNORE_DIRS for part in path.parts):
            continue

        if not path.is_file():
            continue

        # Skip known noise extensions
        if path.suffix.lower() in SKIP_EXTENSIONS:
            continue

        # Skip files with no extension that are large (binary blobs)
        try:
            size = path.stat().st_size
        except OSError:
            continue

        if size == 0 or size > MAX_FILE_SIZE:
            continue

        files.append(path)

    return files