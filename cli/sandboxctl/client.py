import httpx
from rich.console import Console

from sandboxctl.config import get_api_key, get_control_plane_url

console = Console()

def get_client() -> httpx.Client:
    api_key = get_api_key()
    if not api_key:
        console.print("[red]Error: Not logged in. Run `sandboxctl login` first.[/red]")
        raise SystemExit(1)
        
    return httpx.Client(
        base_url=f"{get_control_plane_url()}/api/v1",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=10.0
    )
