"""Persistent LangGraph Checkpointer using SQLite/Disk backing."""
import pickle
from pathlib import Path
from typing import Optional
from collections import defaultdict

from langgraph.checkpoint.memory import MemorySaver
from app.core.config import BASE_DIR

CHECKPOINT_DIR = BASE_DIR / "data" / "checkpoints"
CHECKPOINT_FILE = CHECKPOINT_DIR / "langgraph_state.pkl"


class PersistentCheckpointer(MemorySaver):
    """
    LangGraph checkpointer that persists execution state to disk/database,
    enabling Human-in-the-Loop workflows to resume across server restarts.
    """

    def __init__(self):
        super().__init__()
        CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
        self._load_from_disk()

    def _load_from_disk(self):
        if CHECKPOINT_FILE.exists():
            try:
                with open(CHECKPOINT_FILE, "rb") as f:
                    saved_state = pickle.load(f)
                    self.storage = saved_state.get("storage", defaultdict(dict))
                    self.writes = saved_state.get("writes", defaultdict(dict))
            except Exception as exc:
                print(f"[PersistentCheckpointer] Warning loading checkpoints: {exc}")

    def _save_to_disk(self):
        try:
            CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
            with open(CHECKPOINT_FILE, "wb") as f:
                pickle.dump({"storage": self.storage, "writes": self.writes}, f)
        except Exception as exc:
            print(f"[PersistentCheckpointer] Warning saving checkpoints: {exc}")

    def put(self, config, checkpoint, metadata, new_versions):
        result = super().put(config, checkpoint, metadata, new_versions)
        self._save_to_disk()
        return result

    def put_writes(self, config, writes, task_id):
        result = super().put_writes(config, writes, task_id)
        self._save_to_disk()
        return result


persistent_checkpointer = PersistentCheckpointer()
