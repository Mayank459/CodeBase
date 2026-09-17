"""Background Job Manager for Repository Ingestion with cancellation, state tracking, and SSE streaming."""
import uuid
import queue
import threading
from typing import Dict, Any, Optional, Generator
from datetime import datetime, timezone
import json


from app.storage.db import SessionFactory, IndexingJobModel


class JobCancelledError(Exception):
    """Raised when an indexing job is cancelled by the user."""
    pass


class BackgroundJobManager:
    """
    Production background job manager for repository ingestion.
    Manages job states: queued, running, completed, failed, cancelled.
    Supports cancellation tokens, file-level error reporting, and SSE progress fanout.
    """

    def __init__(self):
        self._cancellation_events: Dict[str, threading.Event] = {}
        self._event_queues: Dict[str, queue.Queue] = {}
        self._active_threads: Dict[str, threading.Thread] = {}

    def create_job(self, repo_url: str, force: bool = False) -> str:
        job_id = f"job-{uuid.uuid4().hex[:10]}"
        with SessionFactory() as session:
            job = IndexingJobModel(
                job_id=job_id,
                repo_url=repo_url,
                status="queued",
                progress=0,
                current_step="queued"
            )
            session.add(job)
            session.commit()

        self._cancellation_events[job_id] = threading.Event()
        self._event_queues[job_id] = queue.Queue()
        return job_id

    def update_job(
        self,
        job_id: str,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        current_step: Optional[str] = None,
        commit_sha: Optional[str] = None,
        error_message: Optional[str] = None,
        file_errors: Optional[list] = None
    ):
        try:
            with SessionFactory() as session:
                job = session.query(IndexingJobModel).filter_by(job_id=job_id).first()
                if job:
                    if status:
                        job.status = status
                    if progress is not None:
                        job.progress = progress
                    if current_step:
                        job.current_step = current_step
                    if commit_sha:
                        job.commit_sha = commit_sha
                    if error_message:
                        job.error_message = error_message
                    if file_errors is not None:
                        job.file_errors_json = json.dumps(file_errors)
                    job.updated_at = datetime.now(timezone.utc)
                    session.commit()

        except Exception as exc:
            print(f"[JobManager] Error updating job {job_id} in DB: {exc}")

    def emit_event(self, job_id: str, event_dict: Dict[str, Any]):
        q = self._event_queues.get(job_id)
        if q:
            q.put(event_dict)

    def cancel_job(self, job_id: str) -> bool:
        event = self._cancellation_events.get(job_id)
        if event:
            event.set()
            self.update_job(job_id, status="cancelled", current_step="cancelled")
            self.emit_event(job_id, {"step": "cancelled", "message": "Job was cancelled by user"})
            return True
        return False

    def is_cancelled(self, job_id: str) -> bool:
        event = self._cancellation_events.get(job_id)
        return event.is_set() if event else False

    def start_job(self, job_id: str, repo_url: str, force: bool = False):
        def worker():
            from app.services.repository_indexer import RepositoryIndexer
            self.update_job(job_id, status="running", progress=5, current_step="initializing")
            self.emit_event(job_id, {"step": "start", "message": f"Starting indexing for {repo_url}"})

            def on_progress(event):
                if self.is_cancelled(job_id):
                    raise JobCancelledError("Indexing cancelled by user request.")
                step = event.get("step", "")
                message = event.get("message", "")
                progress = event.get("progress")
                self.emit_event(job_id, event)
                self.update_job(job_id, progress=progress, current_step=f"{step}: {message}")

            try:
                indexer = RepositoryIndexer()
                cancel_token = self._cancellation_events.get(job_id)
                result = indexer.index_repository(
                    repo_url=repo_url,
                    on_progress=on_progress,
                    force=force,
                    cancel_token=cancel_token
                )
                commit_sha = result.get("commit_sha")
                file_errors = result.get("file_errors", [])
                self.update_job(
                    job_id,
                    status="completed",
                    progress=100,
                    current_step="completed",
                    commit_sha=commit_sha,
                    file_errors=file_errors
                )
                self.emit_event(job_id, {"step": "done", "message": "Indexing completed successfully!", **result})
            except JobCancelledError:
                self.update_job(job_id, status="cancelled", current_step="cancelled")
            except Exception as exc:
                self.update_job(job_id, status="failed", error_message=str(exc), current_step="failed")
                self.emit_event(job_id, {"step": "error", "message": str(exc)})
            finally:
                self.emit_event(job_id, None)  # Sentinel for SSE completion

        t = threading.Thread(target=worker, daemon=True)
        self._active_threads[job_id] = t
        t.start()

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        with SessionFactory() as session:
            job = session.query(IndexingJobModel).filter_by(job_id=job_id).first()
            if not job:
                return None
            return {
                "job_id": job.job_id,
                "repo_url": job.repo_url,
                "status": job.status,
                "progress": job.progress,
                "current_step": job.current_step,
                "commit_sha": job.commit_sha,
                "error_message": job.error_message,
                "file_errors": json.loads(job.file_errors_json or "[]"),
                "created_at": job.created_at.isoformat() if job.created_at else None,
                "updated_at": job.updated_at.isoformat() if job.updated_at else None,
            }

    def stream_job_events(self, job_id: str) -> Generator[str, None, None]:
        q = self._event_queues.get(job_id)
        if not q:
            yield f"data: {json.dumps({'step': 'error', 'message': 'Job not found or already finished'})}\n\n"
            return

        while True:
            try:
                event = q.get(timeout=30.0)
            except queue.Empty:
                # Keep-alive heartbeat comment
                yield ": keep-alive\n\n"
                continue

            if event is None:
                break
            yield f"data: {json.dumps(event)}\n\n"


job_manager = BackgroundJobManager()
