"""CSRF protection and magic-link rate limits (#14)."""

from __future__ import annotations

import re
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.constants import (
    CSRF_COOKIE_NAME,
    MAGIC_LINK_RATE_LIMIT_PER_EMAIL,
    MAGIC_LINK_RATE_LIMIT_PER_IP,
    MAGIC_LINK_RATE_LIMIT_WINDOW,
    MAGIC_LINK_RESPONSE_MESSAGE,
    SESSION_COOKIE_NAME,
)
from app.auth.csrf import issue_csrf_token
from app.auth.keys import load_signing_keyset
from app.auth.magic import issue_magic_link
from app.auth.sessions import create_session
from app.config import settings
from app.models.user import User
from app.time import clock
from tests.conftest import safe_write_headers


@pytest.fixture(autouse=True)
def clean_auth_tables(migrated_database: str) -> None:
    from sqlalchemy import create_engine

    engine = create_engine(migrated_database)
    with engine.begin() as conn:
        conn.execute(
            text("TRUNCATE TABLE sessions, link_tokens, users RESTART IDENTITY CASCADE")
        )
    engine.dispose()


def _extract_token_from_mail(body: str) -> str:
    match = re.search(r"token=([^ \n]+)", body)
    assert match
    return match.group(1)


def test_cross_site_post_rejected(api_client: TestClient) -> None:
    response = api_client.post(
        "/api/v1/magic-links",
        json={"email": "cross@example.com"},
        headers={"Sec-Fetch-Site": "cross-site", "Origin": settings.app_public_url},
    )
    assert response.status_code == 403


def test_cross_site_without_origin_rejected(api_client: TestClient) -> None:
    response = api_client.post(
        "/api/v1/magic-links",
        json={"email": "cross2@example.com"},
        headers={"Sec-Fetch-Site": "cross-site"},
    )
    assert response.status_code == 403


def test_wrong_origin_rejected(api_client: TestClient) -> None:
    response = api_client.post(
        "/api/v1/magic-links",
        json={"email": "origin@example.com"},
        headers={"Origin": "https://evil.example"},
    )
    assert response.status_code == 403


def _sign_in(client: TestClient, mail_capture, email: str) -> str:
    response = client.post(
        "/api/v1/magic-links",
        json={"email": email},
        headers=safe_write_headers(client_ip="203.0.113.1"),
    )
    assert response.status_code == 200
    token = _extract_token_from_mail(mail_capture.messages[-1].body)
    consume = client.post(
        "/api/v1/magic-links/consume",
        json={"token": token},
        headers=safe_write_headers(),
    )
    assert consume.status_code == 200
    csrf = client.cookies.get(CSRF_COOKIE_NAME)
    assert csrf
    return str(csrf)


def test_authenticated_write_missing_csrf(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "nocsrf@example.com")
    response = api_client.post(
        "/api/v1/session/logout",
        headers=safe_write_headers(),
    )
    assert response.status_code == 403


def test_authenticated_write_invalid_csrf(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "badcsrf@example.com")
    response = api_client.post(
        "/api/v1/session/logout",
        headers=safe_write_headers(csrf_token="not-the-real-token"),
    )
    assert response.status_code == 403


def test_csrf_from_other_session_rejected(
    api_client: TestClient,
    mail_capture,
    db_session: Session,
) -> None:
    _sign_in(api_client, mail_capture, "session-a@example.com")

    other_user = User(email="session-b@example.com", display_name=None, created_at=clock.now())
    db_session.add(other_user)
    db_session.commit()
    session_row, verifier_b = create_session(db_session, user_id=other_user.id)
    other_csrf = issue_csrf_token(session_row.id, verifier_b)
    assert other_csrf != api_client.cookies.get(CSRF_COOKIE_NAME)

    api_client.cookies.set(CSRF_COOKIE_NAME, other_csrf)
    response = api_client.post(
        "/api/v1/session/logout",
        headers=safe_write_headers(csrf_token=other_csrf),
    )
    assert response.status_code == 403


def test_logout_succeeds_with_valid_csrf(api_client: TestClient, mail_capture) -> None:
    csrf = _sign_in(api_client, mail_capture, "logoutcsrf@example.com")
    response = api_client.post(
        "/api/v1/session/logout",
        headers=safe_write_headers(csrf_token=csrf),
    )
    assert response.status_code == 204
    assert api_client.get("/api/v1/session").status_code == 401


def test_consume_sets_csrf_cookie(api_client: TestClient, mail_capture) -> None:
    csrf = _sign_in(api_client, mail_capture, "cookiecsrf@example.com")
    session_cookie = api_client.cookies.get(SESSION_COOKIE_NAME)
    assert session_cookie
    session_id, verifier = str(session_cookie).split(".", 1)
    expected = issue_csrf_token(session_id, verifier)
    assert csrf == expected


def test_rate_limit_per_email(
    api_client: TestClient,
    mail_capture,
    controllable_clock,
    frozen_at: datetime,
) -> None:
    email = "ratelimit@example.com"
    ip = "198.51.100.10"
    for _ in range(MAGIC_LINK_RATE_LIMIT_PER_EMAIL):
        response = api_client.post(
            "/api/v1/magic-links",
            json={"email": email},
            headers=safe_write_headers(client_ip=ip),
        )
        assert response.status_code == 200

    blocked = api_client.post(
        "/api/v1/magic-links",
        json={"email": email},
        headers=safe_write_headers(client_ip=ip),
    )
    assert blocked.status_code == 429
    assert blocked.json()["message"] == MAGIC_LINK_RESPONSE_MESSAGE
    assert len(mail_capture.messages) == MAGIC_LINK_RATE_LIMIT_PER_EMAIL


def test_rate_limit_per_ip(
    api_client: TestClient,
    mail_capture,
) -> None:
    ip = "198.51.100.50"
    for i in range(MAGIC_LINK_RATE_LIMIT_PER_IP):
        response = api_client.post(
            "/api/v1/magic-links",
            json={"email": f"user{i}@example.com"},
            headers=safe_write_headers(client_ip=ip),
        )
        assert response.status_code == 200

    blocked = api_client.post(
        "/api/v1/magic-links",
        json={"email": "another@example.com"},
        headers=safe_write_headers(client_ip=ip),
    )
    assert blocked.status_code == 429
    assert blocked.json()["message"] == MAGIC_LINK_RESPONSE_MESSAGE


def test_rate_limit_window_resets(
    api_client: TestClient,
    mail_capture,
    controllable_clock,
    frozen_at: datetime,
) -> None:
    email = "window@example.com"
    ip = "198.51.100.77"
    for _ in range(MAGIC_LINK_RATE_LIMIT_PER_EMAIL):
        api_client.post(
            "/api/v1/magic-links",
            json={"email": email},
            headers=safe_write_headers(client_ip=ip),
        )

    controllable_clock.freeze(frozen_at + MAGIC_LINK_RATE_LIMIT_WINDOW + timedelta(seconds=1))
    retry = api_client.post(
        "/api/v1/magic-links",
        json={"email": email},
        headers=safe_write_headers(client_ip=ip),
    )
    assert retry.status_code == 200


def test_rate_limited_unknown_email_same_message(api_client: TestClient, mail_capture) -> None:
    ip = "198.51.100.99"
    for i in range(MAGIC_LINK_RATE_LIMIT_PER_IP):
        api_client.post(
            "/api/v1/magic-links",
            json={"email": f"iponly{i}@example.com"},
            headers=safe_write_headers(client_ip=ip),
        )
    before = len(mail_capture.messages)
    response = api_client.post(
        "/api/v1/magic-links",
        json={"email": "nobody-here@example.com"},
        headers=safe_write_headers(client_ip=ip),
    )
    assert response.status_code == 429
    assert response.json()["message"] == MAGIC_LINK_RESPONSE_MESSAGE
    assert len(mail_capture.messages) == before


def test_issue_magic_link_stores_request_ip(db_session: Session) -> None:
    from app.models.link_token import LinkToken

    user = User(email="ipstore@example.com", display_name=None, created_at=clock.now())
    db_session.add(user)
    db_session.commit()

    keyset = load_signing_keyset()
    issue_magic_link(db_session, keyset, email=user.email, request_ip="203.0.113.5")
    row = db_session.query(LinkToken).order_by(LinkToken.created_at.desc()).first()
    assert row is not None
    assert row.request_ip == "203.0.113.5"