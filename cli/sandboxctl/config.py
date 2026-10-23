import json
from pathlib import Path
from typing import Any

CONFIG_DIR = Path.home() / ".config" / "sandboxctl"
CONFIG_FILE = CONFIG_DIR / "config.json"

def load_config() -> dict[str, Any]:
    if not CONFIG_FILE.exists():
        return {}
    return json.loads(CONFIG_FILE.read_text())

def save_config(config: dict[str, Any]) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, indent=2))

def get_api_key() -> str | None:
    return load_config().get("api_key")

def get_control_plane_url() -> str:
    return load_config().get("control_plane_url", "http://localhost:8000")
