"""Auth cookie names and flags derived from APP_PUBLIC_URL."""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse

from app.config import Settings, settings

_HOST_SESSION = "__Host-gata-session"
_HOST_CSRF = "__Host-gata-csrf"
_DEV_SESSION = "gata-session"
_DEV_CSRF = "gata-csrf"
_LOCAL_HTTP_HOSTS = frozenset({"localhost", "127.0.0.1"})


@dataclass(frozen=True, slots=True)
class CookiePolicy:
    session_name: str
    csrf_name: str
    secure: bool


def cookie_policy(cfg: Settings) -> CookiePolicy:
    parsed = urlparse(cfg.app_public_url)
    if parsed.scheme == "https":
        return CookiePolicy(_HOST_SESSION, _HOST_CSRF, secure=True)
    if parsed.scheme == "http":
        return CookiePolicy(_DEV_SESSION, _DEV_CSRF, secure=False)
    msg = "APP_PUBLIC_URL must use http or https"
    raise RuntimeError(msg)


def validate_cookie_policy(cfg: Settings | None = None) -> None:
    active = cfg or settings
    parsed = urlparse(active.app_public_url)
    if parsed.scheme == "http":
        host = (parsed.hostname or "").lower()
        if host not in _LOCAL_HTTP_HOSTS:
            msg = (
                "APP_PUBLIC_URL must use https unless the host is localhost or 127.0.0.1 "
                "(insecure cookies are dev-only)"
            )
            raise RuntimeError(msg)
    cookie_policy(active)


_policy: CookiePolicy | None = None


def get_cookie_policy(cfg: Settings | None = None) -> CookiePolicy:
    if cfg is not None:
        return cookie_policy(cfg)
    global _policy
    if _policy is None:
        _policy = cookie_policy(settings)
    return _policy


def reset_cookie_policy_cache() -> None:
    global _policy
    _policy = None