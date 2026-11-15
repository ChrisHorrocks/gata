from __future__ import annotations

import hashlib
import hmac
import uuid
from pathlib import Path

from app.auth.constants import CSRF_HEADER_NAME
from app.auth.cookie_policy import get_cookie_policy
from app.config import Settings, settings


def _load_csrf_secret(cfg: Settings | None = None) -> bytes:
    active = cfg or settings
    if active.csrf_secret:
        return active.csrf_secret.encode("utf-8")
    if active.csrf_secret_file:
        path = Path(active.csrf_secret_file)
        return path.read_text(encoding="utf-8").strip().encode("utf-8")
    msg = "CSRF secret is not configured"
    raise RuntimeError(msg)


_CSRF_SECRET: bytes | None = None


def csrf_secret_bytes(cfg: Settings | None = None) -> bytes:
    global _CSRF_SECRET
    if cfg is not None:
        return _load_csrf_secret(cfg)
    if _CSRF_SECRET is None:
        _CSRF_SECRET = _load_csrf_secret()
    return _CSRF_SECRET


def issue_csrf_token(session_id: str | uuid.UUID, verifier: str) -> str:
    session_part = str(session_id)
    digest = hmac.new(
        csrf_secret_bytes(),
        f"{session_part}.{verifier}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return digest


def verify_csrf_token(session_id: str | uuid.UUID, verifier: str, token: str | None) -> bool:
    if not token:
        return False
    expected = issue_csrf_token(session_id, verifier)
    return hmac.compare_digest(expected, token)


def csrf_cookie_kwargs(token: str) -> dict[str, object]:
    policy = get_cookie_policy()
    return {
        "key": policy.csrf_name,
        "value": token,
        "path": "/",
        "secure": policy.secure,
        "samesite": "lax",
        "httponly": False,
    }


def clear_csrf_cookie_kwargs() -> dict[str, object]:
    policy = get_cookie_policy()
    return {
        "key": policy.csrf_name,
        "value": "",
        "path": "/",
        "secure": policy.secure,
        "samesite": "lax",
        "httponly": False,
        "max_age": 0,
    }


def header_matches_cookie(header_value: str | None, cookie_value: str | None) -> bool:
    if not header_value or not cookie_value:
        return False
    return hmac.compare_digest(header_value, cookie_value)


def csrf_header_name() -> str:
    return CSRF_HEADER_NAME