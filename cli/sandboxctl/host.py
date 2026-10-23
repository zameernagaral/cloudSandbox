import sys
import typer
from rich.console import Console
from sandboxctl.client import get_client

app = typer.Typer(help="Manage your Cloud Sandbox hosts")
console = Console()

@app.command()
def init():
    """Provision Firecracker and the host agent on this machine."""
    console.print("[yellow]Setting up Cloud Sandbox Host Agent...[/yellow]")
    console.print("[dim]This command should ideally be run on a fresh Linux KVM host.[/dim]")
    
    client = get_client()
    try:
        res = client.post("/hosts", json={
            "name": "CLI Provisioned Host",
            "agent_url": "wss://localhost:8765",
            "total_vcpu": 8,
            "total_ram_mb": 16384,
            "total_disk_gb": 100
        })
        res.raise_for_status()
        data = res.json()
        token = data["token"]
        console.print(f"[green]Host registered![/green] Run this command on your KVM server:")
        console.print(f"\n  [cyan]curl -sSL https://raw.githubusercontent.com/your-org/cloud-sandbox/main/host-agent/install.sh | bash -s -- --token {token}[/cyan]\n")
    except Exception as e:
        console.print(f"[red]Error provisioning host: {e}[/red]")
        sys.exit(1)

@app.command()
def list():
    """List connected hosts."""
    client = get_client()
    try:
        res = client.get("/hosts")
        res.raise_for_status()
        hosts = res.json()
        if not hosts:
            console.print("No hosts connected.")
            return
        
        from rich.table import Table
        table = Table("ID", "Name", "Status", "vCPU", "RAM")
        for h in hosts:
            status = "[green]Active[/green]" if h["is_active"] else "[red]Offline[/red]"
            table.add_row(
                h["id"], h["name"], status, str(h["total_vcpu"]), f"{h['total_ram_mb']}MB"
            )
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error listing hosts: {e}[/red]")
        sys.exit(1)
