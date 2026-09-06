"""
Keep-alive script to prevent Render backend from sleeping.
This script sends periodic HTTP requests to the backend to keep it active.
"""

import os
import time
import requests
import threading
from datetime import datetime

# Configuration
API_BASE = os.getenv("API_BASE", "http://localhost:8000")
PING_INTERVAL = 300  # 5 minutes (Render free tier sleeps after 15 min of inactivity)
HEALTH_ENDPOINT = f"{API_BASE}/"


def log_message(msg: str):
    """Log message with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}")


def ping_backend():
    """Send a health check request to the backend."""
    try:
        response = requests.get(HEALTH_ENDPOINT, timeout=10)
        if response.status_code == 200:
            log_message(f"Backend ping successful (Status: {response.status_code})")
            return True
        else:
            log_message(f"Backend ping returned status {response.status_code}")
            return False
    except requests.exceptions.Timeout:
        log_message("Backend ping timed out")
        return False
    except requests.exceptions.ConnectionError:
        log_message("Backend connection error - backend may be starting up")
        return False
    except Exception as e:
        log_message(f"Backend ping error: {str(e)}")
        return False


def keep_alive_loop():
    """Continuously ping the backend at regular intervals."""
    log_message("Keep-alive daemon started")
    log_message(f"Backend URL: {API_BASE}")
    log_message(f"Ping interval: {PING_INTERVAL} seconds ({PING_INTERVAL // 60} minutes)")

    while True:
        try:
            time.sleep(PING_INTERVAL)
            ping_backend()
        except KeyboardInterrupt:
            log_message("Keep-alive daemon stopped by user")
            break
        except Exception as e:
            log_message(f"Keep-alive loop error: {str(e)}")
            time.sleep(10)  # Retry after 10 seconds on error


def start_keep_alive_daemon():
    """Start the keep-alive daemon in a background thread."""
    daemon_thread = threading.Thread(target=keep_alive_loop, daemon=True)
    daemon_thread.start()
    return daemon_thread


if __name__ == "__main__":
    # Run as standalone script
    keep_alive_loop()
