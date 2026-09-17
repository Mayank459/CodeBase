"""Persistent Database Layer for CodeBase AI.
Supports SQLite (local default data/codebase.db) and PostgreSQL via SQLAlchemy,
with graceful fallback if SQLAlchemy is absent.
"""
import os
import json
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from contextlib import contextmanager

from app.core.config import BASE_DIR

def _utcnow():
    return datetime.now(timezone.utc)

# Determine DB URI: default to local SQLite database in data/ directory
DEFAULT_DB_PATH = BASE_DIR / "data" / "codebase.db"
DEFAULT_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}")

try:
    from sqlalchemy import (
        create_engine, Column, String, Integer, Float, Text, Boolean, DateTime
    )
    from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
    HAS_SQLALCHEMY = True
except ImportError:
    HAS_SQLALCHEMY = False
    print("[db] Warning: SQLAlchemy not installed, using fallback in-memory storage.")


if HAS_SQLALCHEMY:
    engine_args = {}
    if DATABASE_URL.startswith("sqlite"):
        engine_args["connect_args"] = {"check_same_thread": False}

    engine = create_engine(DATABASE_URL, **engine_args)
    SessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db_session = scoped_session(SessionFactory)
    Base = declarative_base()

    class RepositoryModel(Base):
        __tablename__ = "repositories"
        name = Column(String(255), primary_key=True, index=True)
        repo_url = Column(String(512), nullable=True)
        commit_sha = Column(String(64), nullable=True)
        file_count = Column(Integer, default=0)
        node_count = Column(Integer, default=0)
        meta_json = Column(Text, default="{}")
        created_at = Column(DateTime, default=_utcnow)
        updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    class IndexingJobModel(Base):
        __tablename__ = "indexing_jobs"
        job_id = Column(String(64), primary_key=True, index=True)
        repo_url = Column(String(512), nullable=False)
        status = Column(String(32), default="queued", index=True)
        progress = Column(Integer, default=0)
        current_step = Column(String(128), default="queued")
        commit_sha = Column(String(64), nullable=True)
        error_message = Column(Text, nullable=True)
        file_errors_json = Column(Text, default="[]")
        created_at = Column(DateTime, default=_utcnow)
        updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    class ApprovalRequestModel(Base):
        __tablename__ = "approval_requests"
        request_id = Column(String(64), primary_key=True, index=True)
        repository_name = Column(String(255), nullable=False, index=True)
        action_type = Column(String(64), nullable=False)
        payload_json = Column(Text, nullable=False)
        status = Column(String(32), default="pending", index=True)
        created_at = Column(DateTime, default=_utcnow)
        resolved_at = Column(DateTime, nullable=True)
        audit_notes = Column(Text, nullable=True)

    class PersistentCheckpointModel(Base):
        __tablename__ = "langgraph_checkpoints"
        thread_id = Column(String(128), primary_key=True, index=True)
        checkpoint_id = Column(String(128), nullable=False)
        state_json = Column(Text, nullable=False)
        updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    class UserModel(Base):
        __tablename__ = "users"
        id = Column(String(64), primary_key=True, index=True)
        username = Column(String(128), unique=True, index=True, nullable=False)
        api_key_hash = Column(String(256), unique=True, index=True, nullable=False)
        role = Column(String(32), default="developer")
        is_active = Column(Boolean, default=True)
        created_at = Column(DateTime, default=_utcnow)

    Base.metadata.create_all(bind=engine)

else:
    # Fallback dummy models and session factory when SQLAlchemy is missing
    class DummyModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

    RepositoryModel = DummyModel
    IndexingJobModel = DummyModel
    ApprovalRequestModel = DummyModel
    PersistentCheckpointModel = DummyModel
    UserModel = DummyModel

    class DummySession:
        def query(self, *args, **kwargs):
            return self
        def filter_by(self, *args, **kwargs):
            return self
        def first(self):
            return None
        def add(self, *args):
            pass
        def commit(self):
            pass
        def delete(self):
            pass
        def close(self):
            pass

    @contextmanager
    def SessionFactory():
        yield DummySession()

    def db_session():
        return DummySession()


def get_db():
    """Dependency for FastAPI routes to obtain DB session."""
    session = db_session()
    try:
        yield session
    finally:
        session.close()


class DatabaseManager:
    """Convenience helper for persistence operations with in-memory fallback."""

    def __init__(self):
        self._in_memory_repos = {}
        self._in_memory_checkpoints = {}

    def save_repository_metadata(self, name: str, repo_url: str = None, commit_sha: str = None, file_count: int = 0, node_count: int = 0, metadata: Dict[str, Any] = None):
        self._in_memory_repos[name] = {
            "name": name,
            "repo_url": repo_url,
            "commit_sha": commit_sha,
            "file_count": file_count,
            "node_count": node_count,
            "metadata": metadata or {},
            "updated_at": _utcnow().isoformat()
        }
        if HAS_SQLALCHEMY:
            try:
                with SessionFactory() as session:
                    repo = session.query(RepositoryModel).filter_by(name=name).first()
                    if not repo:
                        repo = RepositoryModel(name=name)
                        session.add(repo)
                    if repo_url:
                        repo.repo_url = repo_url
                    if commit_sha:
                        repo.commit_sha = commit_sha
                    repo.file_count = file_count
                    repo.node_count = node_count
                    if metadata:
                        repo.meta_json = json.dumps(metadata)
                    repo.updated_at = _utcnow()
                    session.commit()
            except Exception as e:
                print(f"[db] Warning: save_repository_metadata failed: {e}")

    def get_repository_metadata(self, name: str) -> Optional[Dict[str, Any]]:
        if HAS_SQLALCHEMY:
            try:
                with SessionFactory() as session:
                    repo = session.query(RepositoryModel).filter_by(name=name).first()
                    if repo and hasattr(repo, 'name'):
                        return {
                            "name": repo.name,
                            "repo_url": repo.repo_url,
                            "commit_sha": repo.commit_sha,
                            "file_count": repo.file_count,
                            "node_count": repo.node_count,
                            "metadata": json.loads(repo.meta_json or "{}"),
                            "updated_at": repo.updated_at.isoformat() if repo.updated_at else None
                        }
            except Exception:
                pass
        return self._in_memory_repos.get(name)

    def save_checkpoint(self, thread_id: str, checkpoint_id: str, state: Dict[str, Any]):
        clean_state = {}
        for k, v in state.items():
            try:
                json.dumps(v)
                clean_state[k] = v
            except Exception:
                clean_state[k] = str(v)
        self._in_memory_checkpoints[thread_id] = clean_state

        if HAS_SQLALCHEMY:
            try:
                with SessionFactory() as session:
                    cp = session.query(PersistentCheckpointModel).filter_by(thread_id=thread_id).first()
                    if not cp:
                        cp = PersistentCheckpointModel(thread_id=thread_id)
                        session.add(cp)
                    cp.checkpoint_id = checkpoint_id
                    cp.state_json = json.dumps(clean_state)
                    session.commit()
            except Exception as e:
                print(f"[db] Warning: save_checkpoint failed: {e}")

    def load_checkpoint(self, thread_id: str) -> Optional[Dict[str, Any]]:
        if HAS_SQLALCHEMY:
            try:
                with SessionFactory() as session:
                    cp = session.query(PersistentCheckpointModel).filter_by(thread_id=thread_id).first()
                    if cp and hasattr(cp, 'state_json'):
                        return json.loads(cp.state_json)
            except Exception:
                pass
        return self._in_memory_checkpoints.get(thread_id)

    def delete_checkpoint(self, thread_id: str):
        self._in_memory_checkpoints.pop(thread_id, None)
        if HAS_SQLALCHEMY:
            try:
                with SessionFactory() as session:
                    session.query(PersistentCheckpointModel).filter_by(thread_id=thread_id).delete()
                    session.commit()
            except Exception as e:
                print(f"[db] Warning: delete_checkpoint failed: {e}")


db_manager = DatabaseManager()
