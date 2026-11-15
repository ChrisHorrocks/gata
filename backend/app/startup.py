"""Fail fast when required configuration is missing or invalid."""

from __future__ import annotations

from app.auth.keys import load_signing_keyset
from app.config import Settings, settings


def validate_runtime_settings(cfg: Settings | None = None) -> None:
    """Load signing keys and verify mail/auth settings before serving traffic."""
    active = cfg or settings
    if not str(active.smtp_from).strip():
        msg = "SMTP_FROM must be a valid RFC 5321 address"
        raise RuntimeError(msg)
    if not active.app_public_url.startswith(("http://", "https://")):
        msg = "APP_PUBLIC_URL must be an http(s) URL"
        raise RuntimeError(msg)
    if not active.jwt_issuer.startswith(("http://", "https://")):
        msg = "JWT_ISSUER must be an http(s) URL"
        raise RuntimeError(msg)
    load_signing_keyset()