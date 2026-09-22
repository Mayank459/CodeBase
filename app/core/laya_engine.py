"""Laya System 1 Decision Engine Integration for CodeBase.

Provides non-autoregressive, sub-35ms typed decision evaluation across 100+ languages
with an automatic graceful fallback to heuristics when uninstalled or offline.
"""
import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class LayaEngine:
    """Singleton manager for the Laya non-autoregressive decision engine."""

    _instance: Optional["LayaEngine"] = None
    _initialized: bool = False

    def __init__(self):
        self.enabled: bool = os.getenv("USE_LAYA_ENGINE", "false").lower() in ("true", "1", "yes")
        self.preload: bool = os.getenv("LAYA_PRELOAD", "false").lower() in ("true", "1", "yes")
        self.device: str = os.getenv("LAYA_DEVICE", "cpu")
        self.router = None
        self._available: bool = False

        if self.enabled:
            self._initialize_router()

    @classmethod
    def get_instance(cls) -> "LayaEngine":
        if cls._instance is None:
            cls._instance = LayaEngine()
        return cls._instance

    @classmethod
    def reset_instance(cls):
        """Reset singleton (primarily for testing purposes)."""
        cls._instance = None

    def _initialize_router(self):
        try:
            from laya import Router
            logger.info("Initializing Laya Router (preload=%s, device=%s)...", self.preload, self.device)
            # Preload if requested, or lazy-load on demand
            self.router = Router(preload=self.preload)
            self._available = True
            logger.info("Laya Router initialized successfully.")
        except ImportError:
            logger.warning("Laya library is not installed. System will use heuristic fallbacks.")
            self._available = False
            self.router = None
        except Exception as e:
            logger.warning("Failed to initialize Laya Router: %s. Using heuristic fallbacks.", e)
            self._available = False
            self.router = None

    @property
    def is_available(self) -> bool:
        return self.enabled and self._available and self.router is not None

    def predict(
        self,
        state: Any,
        questions: Dict[str, Any],
        model: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Execute typed decision evaluation over state and questions.
        Returns the raw Laya prediction dict, or None if unavailable/error.
        """
        if not self.is_available:
            return None

        try:
            kwargs = {}
            if model:
                kwargs["model"] = model
            return self.router.predict(state, questions, **kwargs)
        except Exception as e:
            logger.warning("Laya predict execution encountered an error: %s", e)
            return None
