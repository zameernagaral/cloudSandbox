import sys
import json
import typer
from rich.console import Console
from rich.table import Table

from sandboxctl.config import save_config, get_control_plane_url, load_config
from sandboxctl.client import get_client
from sandboxctl import host

app = typer.Typer(help="Cloud Sandbox CLI")
app.add_typer(host.app, name="host")
console = Console()

@app.command()
def login(
    api_key: str = typer.Option(..., prompt=True, hide_input=True),
    url: str = typer.Option("http://localhost:8000", help="Control Plane URL")
):
    """Authenticate the CLI with your Cloud Sandbox account."""
    config = load_config()
    config["api_key"] = api_key
    config["control_plane_url"] = url
    save_config(config)
    console.print("[green]Successfully logged in![/green]")

@app.command()
def deploy(
    name: str = typer.Option(None, help="Name of the sandbox"),
    policy: str = typer.Option(None, help="JSON policy overrides (e.g. '{\"max_cost_usd\": 0.5}')")
):
    """Deploy a new sandbox in the cloud."""
    client = get_client()
    try:
        # Get active host
        res = client.get("/hosts")
        res.raise_for_status()
        hosts = res.json()
        active_hosts = [h for h in hosts if h["is_active"]]
        if not active_hosts:
            console.print("[red]No active hosts found. Run `sandboxctl host init`.[/red]")
            raise typer.Exit(1)
            
        host_id = active_hosts[0]["id"]
        
        # Parse policy
        policy_dict = {}
        if policy:
            try:
                policy_dict = json.loads(policy)
            except json.JSONDecodeError:
                console.print("[red]Invalid JSON in policy.[/red]")
                raise typer.Exit(1)
        
        # Create Sandbox
        import random
        import string
        suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        sb_name = name or f"sandbox-{suffix}"
        
        console.print(f"[dim]Deploying sandbox '{sb_name}'...[/dim]")
        res = client.post("/sandboxes", json={
            "name": sb_name,
            "host_id": host_id,
            "vcpu_count": 2,
            "mem_size_mb": 1024,
            # We would create a custom policy if policy_dict was passed, simplified here
        })
        res.raise_for_status()
        sb = res.json()
        
        console.print(f"[green]✔ Sandbox created![/green] ({sb['id']})")
        console.print(f"\n[cyan]Dashboard: {get_control_plane_url().replace('8000', '5173')}/sandbox/{sb['id']}[/cyan]")
        
    except Exception as e:
        console.print(f"[red]Error deploying sandbox: {e}[/red]")
        sys.exit(1)

@app.command()
def list():
    """List running sandboxes."""
    client = get_client()
    try:
        res = client.get("/sandboxes")
        res.raise_for_status()
        sandboxes = res.json()
        
        if not sandboxes:
            console.print("No sandboxes found.")
            return
            
        table = Table("ID", "Name", "State", "Cost", "Tokens")
        for sb in sandboxes:
            color = "green" if sb["state"] == "RUNNING" else "cyan" if sb["state"] == "FROZEN" else "yellow"
            table.add_row(
                sb["id"][:8],
                sb["name"],
                f"[{color}]{sb['state']}[/{color}]",
                f"${sb['total_cost_usd']:.4f}",
                str(sb['total_tokens'])
            )
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error listing sandboxes: {e}[/red]")
        sys.exit(1)

if __name__ == "__main__":
    app()
