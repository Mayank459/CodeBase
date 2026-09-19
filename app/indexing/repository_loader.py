import re
import shutil
import ipaddress
from urllib.parse import urlparse
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

# Blocked private and link-local IP networks for SSRF prevention
BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),  # Cloud metadata
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def _check_ssrf_host(hostname: str) -> None:
    """Verify hostname is not a local or cloud metadata address."""
    if not hostname:
        raise ValueError("Invalid URL: Hostname cannot be empty.")

    host_lower = hostname.lower()
    if host_lower in ["localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal"]:
        raise ValueError(f"SSRF blocked: Host '{hostname}' is not permitted.")

    try:
        ip = ipaddress.ip_address(host_lower)
        for net in BLOCKED_IP_NETWORKS:
            if ip in net:
                raise ValueError(f"SSRF blocked: Private or loopback IP '{ip}' is not permitted.")
    except ValueError as exc:
        if "SSRF blocked" in str(exc):
            raise
        # Not a raw IP literal, hostname resolution can be performed or allowed if safe domain
        pass


def sanitize_repo_name(name: str) -> str:
    """Sanitize repository name to strictly prevent directory traversal."""
    raw = (name or "").strip()
    if raw.endswith(".git"):
        raw = raw[:-4]

    # Reject directory traversal indicators
    if not raw or ".." in raw or "/" in raw or "\\" in raw:
        raise ValueError(f"Invalid or unsafe repository name: '{name}'")

    # Only allow alphanumeric characters, dashes, dots, and underscores
    sanitized = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", raw)
    if sanitized in [".", "..", ""]:
        raise ValueError(f"Invalid repository directory name: '{name}'")

    return sanitized


def normalize_repo_url(repo_url: str) -> str:
    """Normalize short repository names, GitHub shorthand (owner/repo), or URLs with safety checks."""
    raw = (repo_url or "").strip()
    if not raw:
        return "https://github.com/psf/requests"

    # Block git argument injection (e.g. `--upload-pack=...` or `-u`)
    if raw.startswith("-"):
        raise ValueError(f"Invalid repository URL '{repo_url}': URL cannot start with a dash.")

    # Block dangerous git protocol handlers
    if any(raw.lower().startswith(scheme) for scheme in ["ext::", "file://", "fd::", "ssh://-"]):
        raise ValueError(f"Unauthorized git protocol scheme in URL: '{repo_url}'")

    if raw.startswith("http://") or raw.startswith("https://"):
        parsed = urlparse(raw)
        _check_ssrf_host(parsed.hostname or "")
        return raw

    if raw.startswith("git@"):
        # Strictly enforce valid git SSH format for known trusted hosts (e.g. git@github.com:owner/repo.git)
        if not re.match(r"^git@[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+(?:\.git)?$", raw):
            raise ValueError(f"Invalid git SSH URL format: '{repo_url}'")
        return raw

    lowered = raw.lower()
    if lowered in KNOWN_REPOS:
        return KNOWN_REPOS[lowered]

    if "/" in raw:
        parts = [p.strip() for p in raw.split("/") if p.strip()]
        if len(parts) == 2 and all(re.match(r"^[a-zA-Z0-9_\-\.]+$", p) for p in parts):
            return f"https://github.com/{parts[0]}/{parts[1]}"
        raise ValueError(f"Invalid repository shorthand format: '{repo_url}'")

    if re.match(r"^[a-zA-Z0-9_\-\.]+$", raw):
        return f"https://github.com/{raw}/{raw}"

    raise ValueError(f"Unrecognized or invalid repository identifier: '{repo_url}'")


def clone_repository(repo_url: str) -> str:
    """Clone a repository (shallow, depth=1) to local storage.

    Shallow clone only fetches the latest commit — much faster for large repos.
    Automatically normalizes short names like 'requests' or 'psf/requests' to valid GitHub URLs.
    If already cloned, skips and returns the existing path.
    """
    valid_url = normalize_repo_url(repo_url)
    raw_name = valid_url.rstrip("/").split("/")[-1]
    repo_name = sanitize_repo_name(raw_name)

    storage_root = REPOSITORY_STORAGE.resolve()
    storage_root.mkdir(parents=True, exist_ok=True)
    destination = (storage_root / repo_name).resolve()

    # Verify destination is strictly inside storage_root (boundary check)
    if not destination.is_relative_to(storage_root) or destination == storage_root:
        raise ValueError(f"Path traversal detected: destination '{destination}' is outside storage root.")

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
