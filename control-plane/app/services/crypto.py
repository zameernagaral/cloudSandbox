"""AES-256-GCM encryption for API keys and secrets at rest."""

from __future__ import annotations

import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import get_settings


def _get_key() -> bytes:
    settings = get_settings()
    if not settings.encryption_key:
        # Dev fallback — generate from secret_key (not for production!)
        import hashlib
        return hashlib.sha256(settings.secret_key.encode()).digest()
    return base64.b64decode(settings.encryption_key)


def encrypt(plaintext: str) -> str:
    """Encrypt plaintext and return base64(nonce + ciphertext)."""
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ct).decode()


def decrypt(token: str) -> str:
    """Decrypt a token produced by encrypt()."""
    key = _get_key()
    aesgcm = AESGCM(key)
    raw = base64.b64decode(token)
    nonce, ct = raw[:12], raw[12:]
    return aesgcm.decrypt(nonce, ct, None).decode()
