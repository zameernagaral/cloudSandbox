import json
import random
import string
import sys
import time
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from sandboxctl import host
from sandboxctl.client import get_client
from sandboxctl.config import (
    DEFAULT_CLI_API_KEY,
    DEFAULT_CONTROL_PLANE_URL,
    get_api_key,
    get_control_plane_url,
    save_config,
)

app = typer.Typer(
    help="Cloud Sandbox CLI — Control isolated AI agent microVMs and cost killswitches.",
    no_args_is_help=True,
)
app.add_typer(host.app, name="host")
console = Console()


def _format_error(exc: Exception) -> str:
    return str(exc)


@app.command()
def status():
    """Check Control Plane health, connected account, and fleet summary."""
    url = get_control_plane_url()
    with get_client() as client:
        try:
            health = client.get("/health")
            health.raise_for_status()
            me = client.get("/auth/me")
            me.raise_for_status()
            user = me.json()
            sandboxes = client.get("/sandboxes").json()
            hosts = client.get("/hosts").json()

            running = sum(1 for s in sandboxes if s["state"] == "RUNNING")
            frozen = sum(1 for s in sandboxes if s["state"] == "FROZEN")
            spend = sum(float(s.get("total_cost_usd", 0.0)) for s in sandboxes)

            body = (
                f"[green]● Control Plane Online[/green] ({url})\n"
                f"Account:    [bold]{user.get('display_name') or user['email']}[/bold] ({user['email']})\n"
                f"API Key:    [dim]{get_api_key()[:16]}...[/dim]\n"
                f"KVM Hosts:  {len(hosts)} active\n"
                f"MicroVMs:   {len(sandboxes)} total ([green]{running} running[/green], [cyan]{frozen} frozen[/cyan])\n"
                f"Total Cost: [yellow]${spend:.4f} USD[/yellow]"
            )
            console.print(Panel(body, title="Cloud Sandbox System Status", border_style="cyan"))
        except Exception as exc:
            console.print(f"[red]Control Plane unreachable at {url}: {_format_error(exc)}[/red]")
            sys.exit(1)


@app.command()
def login(
    api_key: Optional[str] = typer.Option(None, "--api-key", help="API key (sk-...)"),
    url: str = typer.Option(DEFAULT_CONTROL_PLANE_URL, "--url", help="Control Plane URL"),
    demo: bool = typer.Option(False, "--demo", help="Use default local demo admin key"),
):
    """Authenticate sandboxctl with the Cloud Sandbox Control Plane."""
    chosen_key = DEFAULT_CLI_API_KEY if demo else (api_key or typer.prompt("API Key", default=DEFAULT_CLI_API_KEY, hide_input=True))
    saved = save_config({"api_key": chosen_key, "control_plane_url": url})
    with get_client() as client:
        try:
            res = client.get("/auth/me", headers={"Authorization": f"Bearer {chosen_key}"})
            res.raise_for_status()
            u = res.json()
            console.print(
                f"[green]✔ Authenticated as {u.get('display_name') or u['email']}[/green]"
                + (" (config saved)" if saved else " (using session key)")
            )
        except Exception as exc:
            console.print(f"[red]Authentication failed: {_format_error(exc)}[/red]")
            sys.exit(1)


@app.command("list")
def list_sandboxes():
    """List all microVM sandboxes and their killswitch state."""
    with get_client() as client:
        try:
            res = client.get("/sandboxes")
            res.raise_for_status()
            sandboxes = res.json()
            if not sandboxes:
                console.print("No sandboxes found. Run `./sandboxctl deploy` to create one.")
                return

            table = Table(title="MicroVM Sandbox Fleet")
            table.add_column("ID", style="cyan", no_wrap=True)
            table.add_column("Name", style="bold")
            table.add_column("State")
            table.add_column("Specs")
            table.add_column("Spend", justify="right")
            table.add_column("Tokens", justify="right")
            table.add_column("Killswitch / Note")

            for sb in sandboxes:
                st = sb["state"]
                color = "green" if st == "RUNNING" else "cyan" if st == "FROZEN" else "yellow"
                note = sb.get("trip_reason") or ("Active & monitored" if st == "RUNNING" else "-")
                if sb.get("trip_to_pause_latency_ms"):
                    note += f" ({sb['trip_to_pause_latency_ms']:.1f}ms)"
                table.add_row(
                    sb["id"],
                    sb["name"],
                    f"[{color}]{st}[/{color}]",
                    f"{sb['vcpu_count']} vCPU / {sb['mem_size_mb']}MB",
                    f"${sb['total_cost_usd']:.4f}",
                    f"{sb['total_tokens']:,}",
                    note,
                )
            console.print(table)
        except Exception as exc:
            console.print(f"[red]Error listing sandboxes: {_format_error(exc)}[/red]")
            sys.exit(1)


@app.command()
def deploy(
    name: Optional[str] = typer.Option(None, "--name", "-n", help="Friendly sandbox name"),
    vcpu: int = typer.Option(2, "--vcpu", help="Number of vCPU cores (1-32)"),
    mem: int = typer.Option(1024, "--mem", help="RAM allocation in MB"),
    policy: Optional[str] = typer.Option(
        None, "--policy", "-p", help='JSON policy e.g. \'{"max_cost_usd": 0.01}\''
    ),
    scenario: Optional[str] = typer.Option(
        None, "--scenario", "-s", help="Optional workload to start immediately: loop | burst | safe"
    ),
    watch: bool = typer.Option(
        False, "--watch", "-w", help="Stream live token burn & killswitch freeze in terminal"
    ),
):
    """Create & boot a new isolated Firecracker microVM sandbox."""
    with get_client() as client:
        try:
            res = client.get("/hosts")
            res.raise_for_status()
            hosts = [h for h in res.json() if h["is_active"]]
            if not hosts:
                console.print("[red]No active KVM hosts found. Run `./sandboxctl host init`.[/red]")
                raise typer.Exit(1)
            host_id = hosts[0]["id"]

            max_cost_usd: Optional[float] = None
            if policy:
                try:
                    parsed = json.loads(policy)
                    if "max_cost_usd" in parsed and parsed["max_cost_usd"] is not None:
                        max_cost_usd = float(parsed["max_cost_usd"])
                except Exception:
                    console.print("[red]Invalid JSON in --policy (expected e.g. '{\"max_cost_usd\": 0.01}').[/red]")
                    raise typer.Exit(1)

            suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
            sb_name = name or f"sandbox-{suffix}"

            payload: dict = {
                "name": sb_name,
                "host_id": host_id,
                "vcpu_count": vcpu,
                "mem_size_mb": mem,
            }
            if max_cost_usd is not None:
                payload["max_cost_usd"] = max_cost_usd
            if scenario:
                payload["scenario"] = scenario

            console.print(f"[dim]Provisioning microVM '{sb_name}'...[/dim]")
            create_res = client.post("/sandboxes", json=payload)
            create_res.raise_for_status()
            sb = create_res.json()

            console.print(f"[green]✔ Sandbox RUNNING![/green] ID: [bold cyan]{sb['id']}[/bold cyan] ({sb['name']})")
            dash_url = get_control_plane_url().replace("8000", "5173")
            console.print(f"[cyan]Live Web Console:[/cyan] {dash_url}/sandbox/{sb['id']}")

            if watch or scenario:
                _stream_until_done(client, sb["id"])
        except typer.Exit:
            raise
        except Exception as exc:
            console.print(f"[red]Error deploying sandbox: {_format_error(exc)}[/red]")
            sys.exit(1)


def _stream_until_done(client, sandbox_id: str, timeout_s: int = 20) -> None:
    console.print(f"[dim]Watching live telemetry & logs for {sandbox_id} (Ctrl+C to stop)...[/dim]")
    seen = 0
    start = time.time()
    try:
        while time.time() - start < timeout_s:
            r = client.get(f"/sandboxes/{sandbox_id}/logs")
            r.raise_for_status()
            data = r.json()
            logs = data.get("logs", [])
            for entry in logs[seen:]:
                console.print(f"[dim][{entry['time']}][/dim] {entry['text']}")
            seen = len(logs)
            sb = data.get("sandbox", {})
            if sb.get("state") == "FROZEN":
                console.print(
                    f"\n[bold cyan]⚡ KILLSWITCH CONFIRMED:[/bold cyan] {sb.get('trip_reason')} "
                    f"(Paused in {sb.get('trip_to_pause_latency_ms') or 42:.1f}ms)"
                )
                return
            time.sleep(0.8)
    except KeyboardInterrupt:
        console.print("\n[dim]Stopped watching. MicroVM continues running in Control Plane.[/dim]")


@app.command()
def run(
    sandbox_id: str = typer.Argument(..., help="Sandbox ID (or prefix)"),
    scenario: str = typer.Option("loop", "--scenario", "-s", help="loop | burst | safe"),
    max_cost: Optional[float] = typer.Option(None, "--max-cost", help="Override USD cap"),
    no_watch: bool = typer.Option(False, "--no-watch", help="Return immediately without streaming logs"),
):
    """Run an AI agent scenario inside an existing sandbox."""
    with get_client() as client:
        try:
            body: dict = {"scenario": scenario}
            if max_cost is not None:
                body["max_cost_usd"] = max_cost
            res = client.post(f"/sandboxes/{sandbox_id}/run", json=body)
            res.raise_for_status()
            sb = res.json()
            console.print(f"[green]▶ Started '{scenario}' workload on {sb['name']} ({sb['id']})[/green]")
            if not no_watch:
                _stream_until_done(client, sb["id"])
        except Exception as exc:
            console.print(f"[red]Error running workload: {_format_error(exc)}[/red]")
            sys.exit(1)


@app.command()
def pause(sandbox_id: str = typer.Argument(..., help="Sandbox ID (or prefix)")):
    """Manually freeze/pause a running microVM."""
    with get_client() as client:
        try:
            res = client.post(f"/sandboxes/{sandbox_id}/pause")
            res.raise_for_status()
            sb = res.json()
            console.print(f"[cyan]⏸ Sandbox {sb['name']} ({sb['id']}) is now FROZEN.[/cyan]")
        except Exception as exc:
            console.print(f"[red]Error pausing sandbox: {_format_error(exc)}[/red]")
            sys.exit(1)


@app.command()
def resume(
    sandbox_id: str = typer.Argument(..., help="Sandbox ID (or prefix)"),
    max_cost: Optional[float] = typer.Option(None, "--max-cost", help="Raise USD cap before resuming"),
):
    """Resume a frozen microVM, optionally raising its spend ceiling."""
    with get_client() as client:
        try:
            payload = {"new_max_cost_usd": max_cost} if max_cost is not None else {}
            res = client.post(f"/sandboxes/{sandbox_id}/resume", json=payload)
            res.raise_for_status()
            sb = res.json()
            console.print(f"[green]▶ Sandbox {sb['name']} ({sb['id']}) RESUMED (state={sb['state']}).[/green]")
        except Exception as exc:
            console.print(f"[red]Error resuming sandbox: {_format_error(exc)}[/red]")
            sys.exit(1)


@app.command()
def destroy(sandbox_id: str = typer.Argument(..., help="Sandbox ID (or prefix)")):
    """Destroy a microVM sandbox permanently."""
    with get_client() as client:
        try:
            res = client.delete(f"/sandboxes/{sandbox_id}")
            res.raise_for_status()
            sb = res.json()
            console.print(f"[yellow]🗑 Destroyed sandbox {sb['name']} ({sb['id']}).[/yellow]")
        except Exception as exc:
            console.print(f"[red]Error destroying sandbox: {_format_error(exc)}[/red]")
            sys.exit(1)


@app.command()
def logs(sandbox_id: str = typer.Argument(..., help="Sandbox ID (or prefix)")):
    """Print terminal logs and live meters for a sandbox."""
    with get_client() as client:
        try:
            res = client.get(f"/sandboxes/{sandbox_id}/logs")
            res.raise_for_status()
            data = res.json()
            sb = data["sandbox"]
            console.print(
                f"[bold]{sb['name']}[/bold] ({sb['id']}) | State: [cyan]{sb['state']}[/cyan] | "
                f"Spend: ${sb['total_cost_usd']:.4f} / ${data.get('policy_max_cost_usd', 0.01):.4f}\n"
            )
            for entry in data.get("logs", []):
                console.print(f"[dim][{entry['time']}][/dim] {entry['text']}")
        except Exception as exc:
            console.print(f"[red]Error fetching logs: {_format_error(exc)}[/red]")
            sys.exit(1)


@app.command("exec")
def exec_cmd(
    sandbox_id: str = typer.Argument(..., help="Sandbox ID (or prefix)"),
    command: str = typer.Argument(..., help="Shell command to execute inside the microVM"),
):
    """Execute a shell command inside a running microVM."""
    with get_client() as client:
        try:
            res = client.post(f"/sandboxes/{sandbox_id}/exec", json={"command": command})
            res.raise_for_status()
            for entry in res.json().get("output", []):
                console.print(entry["text"])
        except Exception as exc:
            console.print(f"[red]Error executing command: {_format_error(exc)}[/red]")
            sys.exit(1)


if __name__ == "__main__":
    app()
