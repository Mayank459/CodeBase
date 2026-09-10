import shutil
from pathlib import Path
from git import Repo, GitCommandError

from app.core.config import REPOSITORY_STORAGE

KNOWN_REPOS = {
    "requests": "https://github.com/psf/requests",
    "fastapi": "https://github.com/fastapi/fastapi",
    "flask": "https://github.com/pallets/flask",
    "django": "https://github.com/django/django",
    "codebase": "https://github.com/Mayank459/CodeBase",
}


def normalize_repo_url(repo_url: str) -> str:
    """Normalize short repository names, GitHub shorthand (owner/repo), or URLs."""
    raw = (repo_url or "").strip()
    if not raw:
        return "https://github.com/psf/requests"

    if raw.startswith("http://") or raw.startswith("https://") or raw.startswith("git@"):
        return raw

    lowered = raw.lower()
    if lowered in KNOWN_REPOS:
        return KNOWN_REPOS[lowered]

    if "/" in raw:
        return f"https://github.com/{raw}"

    return f"https://github.com/{raw}/{raw}"


def clone_repository(repo_url: str) -> str:
    """Clone a repository (shallow, depth=1) to local storage.

    Shallow clone only fetches the latest commit — much faster for large repos.
    Automatically normalizes short names like 'requests' or 'psf/requests' to valid GitHub URLs.
    If already cloned, skips and returns the existing path.
    """
    valid_url = normalize_repo_url(repo_url)
    repo_name = valid_url.rstrip("/").split("/")[-1]

    if repo_name.endswith(".git"):
        repo_name = repo_name[:-4]

    destination = REPOSITORY_STORAGE / repo_name

    # Check if a valid, non-empty repository already exists
    if destination.exists():
        if any(destination.iterdir()):
            return str(destination)
        # Clean up empty remnant directory from previous failed clone
        try:
            shutil.rmtree(destination, ignore_errors=True)
        except Exception:
            pass

    # depth=1 → only the latest snapshot, skip full history
    try:
        Repo.clone_from(
            valid_url,
            destination,
            depth=1,
            single_branch=True,
            env={"GIT_TERMINAL_PROMPT": "0"}
        )
    except GitCommandError as e:
        # If directory was left empty after error, clean it up
        if destination.exists() and not any(destination.iterdir()):
            shutil.rmtree(destination, ignore_errors=True)
        raw_err = e.stderr.strip() if e.stderr else str(e)
        if "could not read Username" in raw_err or "Authentication failed" in raw_err or "terminal prompts disabled" in raw_err:
            hint = " The repository either does not exist on GitHub (404) or is private. Please verify the URL and ensure the repo is public."
        else:
            hint = ""
        raise ValueError(
            f"Failed to clone repository from '{valid_url}'.{hint} (Git: {raw_err})"
        ) from e

    return str(destination)
