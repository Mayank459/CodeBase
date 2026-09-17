"""Authentication, Authorization, and Rate Limiting dependencies."""
import os
import time
from typing import Optional, Dict, Any
from collections import defaultdict
from fastapi import Header, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.storage.db import SessionFactory, UserModel

security_bearer = HTTPBearer(auto_error=False)

# Configuration flag: if True, strict token verification is enforced.
# In local development mode, defaults to permissive dev user.
AUTH_REQUIRED = os.getenv("AUTH_REQUIRED", "false").lower() in ["true", "1", "yes"]
MASTER_API_KEY = os.getenv("MASTER_API_KEY", "codebase-master-key-2026")


class UserIdentity:
    def __init__(self, user_id: str, username: str, role: str = "developer", is_admin: bool = False):
        self.user_id = user_id
        self.username = username
        self.role = role
        self.is_admin = is_admin

    def __repr__(self):
        return f"<UserIdentity id={self.user_id} name={self.username} role={self.role}>"


class RateLimiter:
    """Sliding-window in-memory rate limiter per key (user_id / IP / repo)."""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.request_timestamps: Dict[str, list] = defaultdict(list)

    def check(self, key: str):
        now = time.time()
        window_start = now - self.window_seconds

        # Prune older timestamps
        timestamps = [ts for ts in self.request_timestamps[key] if ts > window_start]
        self.request_timestamps[key] = timestamps

        if len(timestamps) >= self.max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded: maximum {self.max_requests} requests per {self.window_seconds} seconds."
            )
        self.request_timestamps[key].append(now)


api_rate_limiter = RateLimiter(max_requests=100, window_seconds=60)
pr_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)


async def get_current_user(
    authorization: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> UserIdentity:
    """
    Authenticate request via Bearer Token or X-API-Key header.
    In local single-user mode (AUTH_REQUIRED=false), automatically returns local dev user.
    """
    token = None
    if authorization and authorization.credentials:
        token = authorization.credentials
    elif x_api_key:
        token = x_api_key

    # Permissive local dev mode fallback
    if not AUTH_REQUIRED:
        if token == MASTER_API_KEY:
            return UserIdentity("admin-1", "admin", role="admin", is_admin=True)
        return UserIdentity("local-dev-user", "developer", role="admin", is_admin=True)

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide 'Authorization: Bearer <token>' or 'X-API-Key: <key>'."
        )

    # Master key bypass
    if token == MASTER_API_KEY:
        return UserIdentity("admin-0", "master_admin", role="admin", is_admin=True)

    # Check Database users
    with SessionFactory() as session:
        user = session.query(UserModel).filter_by(api_key_hash=token, is_active=True).first()
        if not user:
            raise HTTPException(status_code=403, detail="Invalid or revoked authentication credentials.")
        return UserIdentity(
            user_id=user.id,
            username=user.username,
            role=user.role,
            is_admin=(user.role == "admin")
        )


def verify_repo_access(repository_name: str, user: UserIdentity = Depends(get_current_user)) -> bool:
    """
    Verify user has permission to read and query the specified repository.
    Enforces repository isolation.
    """
    if not repository_name:
        raise HTTPException(status_code=400, detail="Repository name cannot be empty.")

    # Admin has universal access
    if user.is_admin:
        return True

    # Multi-tenant scoping: check if repository is permitted for this user
    # If users are scoped to their own namespaces (e.g. 'username/repo')
    if "/" in repository_name:
        owner = repository_name.split("/")[0].lower()
        if owner != user.username.lower():
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: User '{user.username}' is not authorized to access repository '{repository_name}'."
            )

    return True


def check_pr_authorization(repository_name: str, user: UserIdentity = Depends(get_current_user)) -> bool:
    """
    Verify user has write authorization before creating pull requests or branch mutations.
    """
    verify_repo_access(repository_name, user)
    if user.role not in ["admin", "developer", "maintainer"]:
        raise HTTPException(
            status_code=403,
            detail=f"Write authorization required: User '{user.username}' with role '{user.role}' cannot trigger PR creation."
        )
    # Apply PR rate limit
    pr_rate_limiter.check(user.user_id)
    return True
