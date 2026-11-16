import sys
import typer
from rich.console import Console
from rich.table import Table

from sandboxctl.client import get_client

app = typer.Typer(help="Manage your Cloud Sandbox bare-metal KVM hosts")
console = Console()


@app.command()
def init(
    name: str = typer.Option("CLI Provisioned Host", help="Friendly name for this KVM node"),
    agent_url: str = typer.Option("wss://127.0.0.1:8765", help="Host agent WebSocket endpoint"),
):
    """Register a Firecracker host machine with the Cloud Sandbox Control Plane."""
    console.print("[cyan]Registering KVM host node with Control Plane...[/cyan]")
    with get_client() as client:
        try:
            res = client.post(
                "/hosts",
                json={
                    "name": name,
                    "agent_url": agent_url,
                    "total_vcpu": 16,
                    "total_ram_mb": 32768,
                    "total_disk_gb": 500,
                },
            )
            res.raise_for_status()
            data = res.json()
            token = data["token"]
            host_id = data.get("host_id") or data.get("id")
            console.print(f"[green]✔ Host registered![/green] ID: [bold]{host_id}[/bold]")
            console.print("\nTo attach a physical Ubuntu KVM host agent daemon, run:")
            console.print(
                f"  [cyan]curl -sSL https://raw.githubusercontent.com/your-org/cloud-sandbox/main/host-agent/install.sh | bash -s -- --token {token}[/cyan]\n"
            )
        except Exception as exc:
            console.print(f"[red]Error provisioning host: {exc}[/red]")
            sys.exit(1)


@app.command("list")
def list_hosts():
    """List connected Firecracker KVM host nodes."""
    with get_client() as client:
        try:
            res = client.get("/hosts")
            res.raise_for_status()
            hosts = res.json()
            if not hosts:
                console.print("No hosts connected. Run `./sandboxctl host init`.")
                return

            table = Table(title="Connected Firecracker KVM Hosts")
            table.add_column("ID", style="cyan")
            table.add_column("Name", style="bold")
            table.add_column("Status")
            table.add_column("vCPU")
            table.add_column("RAM")
            table.add_column("Hypervisor")
            for h in hosts:
                status_badge = "[green]ACTIVE[/green]" if h["is_active"] else "[red]OFFLINE[/red]"
                table.add_row(
                    h["id"],
                    h["name"],
                    status_badge,
                    str(h["total_vcpu"]),
                    f"{round(h['total_ram_mb'] / 1024)} GB",
                    h.get("firecracker_version") or "v1.7.0",
                )
            console.print(table)
        except Exception as exc:
            console.print(f"[red]Error listing hosts: {exc}[/red]")
            sys.exit(1)
