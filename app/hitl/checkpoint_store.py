"""Persistent Checkpoint Store for HITL workflows."""
from typing import Optional, Dict, Any
from app.storage.db import db_manager, ApprovalRequestModel, SessionFactory
import json
from datetime import datetime


class CheckpointStore:
    """
    Persistent HITL checkpoint and approval state store.
    Saves approval requests and LangGraph state to the database, ensuring
    states are preserved across worker and container restarts.
    """

    def __init__(self):
        self.in_memory_cache: Dict[str, Dict[str, Any]] = {}

    def save(self, request_id: str, state: Dict[str, Any], repository_name: str = "unknown", action_type: str = "approval"):
        self.in_memory_cache[request_id] = state
        try:
            # 1. Save checkpoint state
            db_manager.save_checkpoint(thread_id=request_id, checkpoint_id=request_id, state=state)

            # 2. Record approval request in audit table
            with SessionFactory() as session:
                req = session.query(ApprovalRequestModel).filter_by(request_id=request_id).first()
                if not req:
                    req = ApprovalRequestModel(
                        request_id=request_id,
                        repository_name=repository_name,
                        action_type=action_type,
                        payload_json=json.dumps(state.get("approval_request") or {}),
                        status="pending"
                    )
                    session.add(req)
                session.commit()
        except Exception as exc:
            print(f"[CheckpointStore] DB save warning: {exc}")

    def load(self, request_id: str) -> Optional[Dict[str, Any]]:
        # Check in-memory cache first
        if request_id in self.in_memory_cache:
            return self.in_memory_cache[request_id]

        # Check DB
        try:
            state = db_manager.load_checkpoint(request_id)
            if state:
                self.in_memory_cache[request_id] = state
                return state
        except Exception as exc:
            print(f"[CheckpointStore] DB load error: {exc}")

        return None

    def remove(self, request_id: str, resolution: str = "resolved"):
        self.in_memory_cache.pop(request_id, None)
        try:
            db_manager.delete_checkpoint(request_id)
            with SessionFactory() as session:
                req = session.query(ApprovalRequestModel).filter_by(request_id=request_id).first()
                if req:
                    req.status = resolution
                    req.resolved_at = datetime.utcnow()
                    session.commit()
        except Exception as exc:
            print(f"[CheckpointStore] DB remove error: {exc}")


checkpoint_store = CheckpointStore()
