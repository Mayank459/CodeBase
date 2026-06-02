from pathlib import Path

from git import Repo

from app.core.config import REPOSITORY_STORAGE


def clone_repository(repo_url: str) -> str:
    """Clone a repository (shallow, depth=1) to local storage.

    Shallow clone only fetches the latest commit — much faster for large repos.
    If already cloned, skips and returns the existing path.
    """
    repo_name = repo_url.rstrip("/").split("/")[-1]

    if repo_name.endswith(".git"):
        repo_name = repo_name[:-4]

    destination = REPOSITORY_STORAGE / repo_name

    if destination.exists():
        return str(destination)

    # depth=1 → only the latest snapshot, skip full history
    Repo.clone_from(repo_url, destination, depth=1, single_branch=True)

    return str(destination)