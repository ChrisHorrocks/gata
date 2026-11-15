"""Cookie policy derived from APP_PUBLIC_URL."""

from __future__ import annotations

import re

import pytest
from fastapi.testclient import TestClient

from app.auth.cookie_policy import cookie_policy, reset_cookie_policy_cache, validate_cookie_policy
from app.config import Settings
from app.startup import validate_runtime_settings
from tests.conftest import safe_write_headers

_ENV_MIN = {
    "database_url": "postgresql+psycopg://gata:gata@localhost:5432/gata",
    "smtp_from": "noreply@example.com",
    "csrf_secret": "test-csrf-secret",
}


def test_cookie_policy_https_production_names() -> None:
    policy = cookie_policy(Settings(app_public_url="https://app.example.com", **_ENV_MIN))
    assert policy.session_name == "__Host-gata-session"
    assert policy.csrf_name == "__Host-gata-csrf"
    assert policy.secure is True


def test_cookie_policy_http_localhost_dev_names() -> None:
    policy = cookie_policy(Settings(app_public_url="http://localhost:5173", **_ENV_MIN))
    assert policy.session_name == "gata-session"
    assert policy.csrf_name == "gata-csrf"
    assert policy.secure is False


def test_validate_cookie_policy_refuses_http_non_localhost() -> None:
    cfg = Settings(app_public_url="http://app.example.com", **_ENV_MIN)
    with pytest.raises(RuntimeError, match="localhost"):
        validate_cookie_policy(cfg)


def test_validate_runtime_settings_refuses_http_non_localhost() -> None:
    cfg = Settings(
        app_public_url="http://evil.example",
        jwt_issuer="https://evil.example",
        jwt_signing_keys_file="tests/fixtures/signing_keys.json",
        **_ENV_MIN,
    )
    with pytest.raises(RuntimeError, match="localhost"):
        validate_runtime_settings(cfg)


def _extract_token_from_mail(body: str) -> str:
    match = re.search(r"token=([^ \n]+)", body)
    assert match
    return match.group(1)


def _sign_in_and_session_ok(client: TestClient, mail_capture, email: str) -> None:
    response = client.post(
        "/api/v1/magic-links",
        json={"email": email},
        headers=safe_write_headers(client_ip="203.0.113.9"),
    )
    assert response.status_code == 200
    token = _extract_token_from_mail(mail_capture.messages[-1].body)
    consume = client.post(
        "/api/v1/magic-links/consume",
        json={"token": token},
        headers=safe_write_headers(),
    )
    assert consume.status_code == 200
    assert client.get("/api/v1/session").status_code == 200


@pytest.mark.parametrize(
    ("public_url", "session_name", "csrf_name", "expects_secure"),
    [
        ("http://localhost:5173", "gata-session", "gata-csrf", False),
        ("https://testserver", "__Host-gata-session", "__Host-gata-csrf", True),
    ],
)
def test_sign_in_respects_cookie_policy(
    api_client: TestClient,
    mail_capture,
    monkeypatch: pytest.MonkeyPatch,
    public_url: str,
    session_name: str,
    csrf_name: str,
    expects_secure: bool,
) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "app_public_url", public_url)
    reset_cookie_policy_cache()
    policy = cookie_policy(settings)
    assert policy.session_name == session_name
    assert policy.csrf_name == csrf_name
    assert policy.secure is expects_secure

    _sign_in_and_session_ok(api_client, mail_capture, f"policy-{session_name}@example.com")
    assert api_client.cookies.get(session_name)
    assert api_client.cookies.get(csrf_name)

    response = api_client.post(
        "/api/v1/magic-links",
        json={"email": "flags@example.com"},
        headers=safe_write_headers(client_ip="203.0.113.10"),
    )
    assert response.status_code == 200
    token = _extract_token_from_mail(mail_capture.messages[-1].body)
    consume = api_client.post(
        "/api/v1/magic-links/consume",
        json={"token": token},
        headers=safe_write_headers(),
    )
    consume_headers = consume.headers.get("set-cookie", "")
    assert session_name in consume_headers
    assert csrf_name in consume_headers
    assert ("secure" in consume_headers.lower()) == expects_secure


@pytest.fixture(autouse=True)
def reset_policy_cache() -> None:
    yield
    reset_cookie_policy_cache()