#!/usr/bin/env bash
# Install guest agent into a mounted rootfs
set -euo pipefail

ROOTFS_MOUNT="${1:-/mnt/rootfs}"
AGENT_SRC="$(dirname "$0")/guest_agent.py"

echo "Installing guest agent into $ROOTFS_MOUNT..."

install -m 755 "$AGENT_SRC" "$ROOTFS_MOUNT/usr/local/bin/guest-agent"

cat > "$ROOTFS_MOUNT/etc/systemd/system/guest-agent.service" << 'SERVICE'
[Unit]
Description=Cloud Sandbox Guest Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/python3 /usr/local/bin/guest-agent
Restart=always
RestartSec=2
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

# Enable the service
chroot "$ROOTFS_MOUNT" systemctl enable guest-agent.service 2>/dev/null || true

echo "Guest agent installed successfully."
