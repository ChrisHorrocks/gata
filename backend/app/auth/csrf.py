from __future__ import annotations

import hashlib
import hmac
import uuid
from pathlib import Path

from app.auth.constants import CSRF_COOKIE_NAME, CSRF_HEADER_NAME
from app.config import settings


def _load_csrf_secret() -> bytes:
    if settings.csrf_secret:
        return settings.csrf_secret.encode("utf-8")
    if settings.csrf_secret_file:
        path = Path(settings.csrf_secret_file)
        return path.read_text(encoding="utf-8").strip().encode("utf-8")
    fixture = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "csrf_secret.txt"
    if fixture.is_file():
        return fixture.read_text(encoding="utf-8").strip().encode("utf-8")
    msg = "CSRF secret is not configured"
    raise RuntimeError(msg)


_CSRF_SECRET: bytes | None = None


def csrf_secret_bytes() -> bytes:
    global _CSRF_SECRET
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
    return {
        "key": CSRF_COOKIE_NAME,
        "value": token,
        "path": "/",
        "secure": True,
        "samesite": "lax",
        "httponly": False,
    }


def clear_csrf_cookie_kwargs() -> dict[str, object]:
    return {
        "key": CSRF_COOKIE_NAME,
        "value": "",
        "path": "/",
        "secure": True,
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