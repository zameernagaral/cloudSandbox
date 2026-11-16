"""Standard-library PBKDF2 password hashing and verification."""

from __future__ import annotations

import base64
import hashlib
import hmac
import os


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"pbkdf2_sha256${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(plain: str, hashed: str) -> bool:
    try:
        scheme, b64_salt, b64_hash = hashed.split("$", 2)
        if scheme != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(b64_salt)
        expected = base64.b64decode(b64_hash)
        actual = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, 120_000)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False
