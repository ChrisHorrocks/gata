from __future__ import annotations

from urllib.parse import urlparse

from starlette.requests import Request

from app.config import settings

_STATE_CHANGING = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def _expected_origin() -> tuple[str, str, int | None]:
    parsed = urlparse(settings.app_public_url)
    scheme = parsed.scheme
    host = parsed.hostname or ""
    port = parsed.port
    if port is None:
        port = 443 if scheme == "https" else 80
    return scheme, host, port


def _origin_matches(origin: str) -> bool:
    parsed = urlparse(origin)
    if not parsed.scheme or not parsed.hostname:
        return False
    exp_scheme, exp_host, exp_port = _expected_origin()
    port = parsed.port
    if port is None:
        port = 443 if parsed.scheme == "https" else 80
    return parsed.scheme == exp_scheme and parsed.hostname == exp_host and port == exp_port


def is_state_changing_method(method: str) -> bool:
    return method.upper() in _STATE_CHANGING


def fetch_metadata_rejects_request(request: Request) -> bool:
    """Return True when the request must be rejected as a cross-site write."""
    if not is_state_changing_method(request.method):
        return False

    site = request.headers.get("sec-fetch-site")
    if site is not None:
        return site.lower() == "cross-site"

    origin = request.headers.get("origin")
    if origin is None:
        return True
    if origin == "null":
        return True
    return not _origin_matches(origin)