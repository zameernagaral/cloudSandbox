import json
import os
from pathlib import Path
from typing import Any

DEFAULT_CLI_API_KEY = "sk-live-cloud-sandbox-admin-key"
DEFAULT_CONTROL_PLANE_URL = "http://localhost:8000"

CONFIG_DIR = Path.home() / ".config" / "sandboxctl"
CONFIG_FILE = CONFIG_DIR / "config.json"


def load_config() -> dict[str, Any]:
    try:
        if CONFIG_FILE.exists():
            return json.loads(CONFIG_FILE.read_text())
    except Exception:
        pass
    return {}


def save_config(config: dict[str, Any]) -> bool:
    try:
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        CONFIG_FILE.write_text(json.dumps(config, indent=2))
        return True
    except Exception:
        return False


def get_api_key() -> str:
    return (
        os.environ.get("SANDBOXCTL_API_KEY")
        or load_config().get("api_key")
        or DEFAULT_CLI_API_KEY
    )


def get_control_plane_url() -> str:
    return (
        os.environ.get("SANDBOXCTL_URL")
        or load_config().get("control_plane_url")
        or DEFAULT_CONTROL_PLANE_URL
    )
