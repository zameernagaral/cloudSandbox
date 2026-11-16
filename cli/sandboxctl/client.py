import httpx
from rich.console import Console

from sandboxctl.config import get_api_key, get_control_plane_url

console = Console()


def get_client() -> httpx.Client:
    api_key = get_api_key()
    cp_url = get_control_plane_url().rstrip("/")
    is_local = "localhost" in cp_url or "127.0.0.1" in cp_url
    return httpx.Client(
        base_url=f"{cp_url}/api/v1",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=10.0,
        trust_env=not is_local,
    )
