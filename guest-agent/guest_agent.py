#!/usr/bin/env python3
"""
Guest Agent — runs inside the microVM.

Responsibilities:
1. Opens a PTY and spawns /bin/bash (or the user's shell)
2. Listens on vsock for connections from the host
3. Relays PTY I/O over vsock
4. Handles resize messages
5. Reports CPU/memory stats periodically (via vsock)

Baked into the rootfs as /usr/local/bin/guest-agent.
Runs as a systemd service on guest boot.
"""

from __future__ import annotations

import asyncio
import fcntl
import json
import os
import pty
import signal
import socket
import struct
import sys
import termios
import threading

# ── Constants ─────────────────────────────────────────────────────────────────
VSOCK_PORT = 3000
AF_VSOCK = 40  # Linux AF_VSOCK


def _set_winsize(fd: int, rows: int, cols: int) -> None:
    """Set terminal window size via TIOCSWINSZ ioctl."""
    winsize = struct.pack("HHHH", rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)


class GuestAgent:
    def __init__(self) -> None:
        self.pty_master: int | None = None
        self.pty_slave: int | None = None
        self.child_pid: int | None = None
        self._connections: list[socket.socket] = []

    def _spawn_pty(self) -> None:
        """Fork a bash process with a PTY."""
        master_fd, slave_fd = pty.openpty()
        _set_winsize(master_fd, 24, 80)

        pid = os.fork()
        if pid == 0:
            # Child: set up PTY as controlling terminal
            os.setsid()
            fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
            os.dup2(slave_fd, 0)
            os.dup2(slave_fd, 1)
            os.dup2(slave_fd, 2)
            os.close(master_fd)
            os.close(slave_fd)
            env = os.environ.copy()
            env["TERM"] = "xterm-256color"
            env["HOME"] = "/root"
            env["SANDBOX"] = "1"
            os.execvpe("/bin/bash", ["/bin/bash", "-l"], env)
            sys.exit(1)

        # Parent
        os.close(slave_fd)
        self.pty_master = master_fd
        self.child_pid = pid

    def _open_vsock_server(self) -> socket.socket:
        """Listen on vsock for host connections."""
        sock = socket.socket(AF_VSOCK, socket.SOCK_STREAM)
        sock.bind((socket.VMADDR_CID_ANY, VSOCK_PORT))
        sock.listen(5)
        sock.setblocking(True)
        return sock

    def _relay_pty_to_conn(self, conn: socket.socket) -> None:
        """Thread: read PTY → write to vsock connection."""
        try:
            while True:
                data = os.read(self.pty_master, 4096)
                if not data:
                    break
                conn.sendall(data)
        except (OSError, BrokenPipeError):
            pass

    def _relay_conn_to_pty(self, conn: socket.socket) -> None:
        """Thread: read vsock → write to PTY."""
        try:
            buf = b""
            while True:
                data = conn.recv(4096)
                if not data:
                    break
                buf += data
                # Check for resize message (JSON line)
                while b"\n" in buf:
                    line, _, buf = buf.partition(b"\n")
                    try:
                        msg = json.loads(line.decode())
                        if msg.get("type") == "resize":
                            _set_winsize(self.pty_master, msg["rows"], msg["cols"])
                            continue
                    except Exception:
                        pass
                    # Regular input
                    os.write(self.pty_master, line + b"\n" if buf else line)
                if buf and not buf.endswith(b"\n"):
                    os.write(self.pty_master, buf)
                    buf = b""
        except (OSError, BrokenPipeError):
            pass

    def _handle_connection(self, conn: socket.socket) -> None:
        """Handle a single vsock connection with two relay threads."""
        self._connections.append(conn)
        t_out = threading.Thread(target=self._relay_pty_to_conn, args=(conn,), daemon=True)
        t_in = threading.Thread(target=self._relay_conn_to_pty, args=(conn,), daemon=True)
        t_out.start()
        t_in.start()
        t_out.join()
        t_in.join()
        conn.close()
        self._connections.remove(conn)

    def run(self) -> None:
        """Main loop."""
        print("[guest-agent] starting...", file=sys.stderr)
        self._spawn_pty()
        print(f"[guest-agent] spawned shell pid={self.child_pid}", file=sys.stderr)

        server = self._open_vsock_server()
        print(f"[guest-agent] listening on vsock port {VSOCK_PORT}", file=sys.stderr)

        while True:
            try:
                conn, addr = server.accept()
                print(f"[guest-agent] connection from {addr}", file=sys.stderr)
                t = threading.Thread(target=self._handle_connection, args=(conn,), daemon=True)
                t.start()
            except KeyboardInterrupt:
                break

        server.close()
        if self.child_pid:
            os.kill(self.child_pid, signal.SIGTERM)


if __name__ == "__main__":
    agent = GuestAgent()
    agent.run()
