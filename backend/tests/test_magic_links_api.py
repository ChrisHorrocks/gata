"""Magic-link sign-in and session API tests (#13)."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from joserfc import jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.constants import (
    MAGIC_TOKEN_TTL,
    MAGIC_TOKEN_TYP,
    SESSION_COOKIE_NAME,
    SESSION_SLIDING_TTL,
)
from app.auth.keys import active_signing_key, load_signing_keyset
from app.auth.magic import MagicTokenError, consume_magic_link, inspect_magic_link, issue_magic_link
from app.auth.sessions import advance_session_times_for_tests
from app.config import settings
from app.time import clock


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


def _request_link(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/v1/magic-links", json={"email": email})
    assert response.status_code == 200
    return response.json()


def _sign_in(client: TestClient, mail_capture, email: str) -> str:
    _request_link(client, email)
    assert len(mail_capture.messages) == 1
    token = _extract_token_from_mail(mail_capture.messages[0].body)
    response = client.post("/api/v1/magic-links/consume", json={"token": token})
    assert response.status_code == 200
    return token


def test_request_magic_link_same_response_and_mail(
    api_client: TestClient,
    mail_capture,
) -> None:
    known = _request_link(api_client, "alice@example.com")
    unknown = _request_link(api_client, "nobody@example.com")
    assert known == unknown
    assert len(mail_capture.messages) == 2
    assert "sign-in/confirm" in mail_capture.messages[0].body
    parsed = urlparse(mail_capture.messages[0].body.split()[-1])
    assert parse_qs(parsed.query).get("token")


def test_inspect_does_not_consume(api_client: TestClient, mail_capture) -> None:
    email = "inspect@example.com"
    _request_link(api_client, email)
    token = _extract_token_from_mail(mail_capture.messages[0].body)

    first = api_client.post("/api/v1/magic-links/inspect", json={"token": token})
    second = api_client.post("/api/v1/magic-links/inspect", json={"token": token})
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["email"] == email

    consume = api_client.post("/api/v1/magic-links/consume", json={"token": token})
    assert consume.status_code == 200


def test_consume_creates_account_and_session(api_client: TestClient, mail_capture) -> None:
    email = "newuser@example.com"
    _sign_in(api_client, mail_capture, email)

    session = api_client.get("/api/v1/session")
    assert session.status_code == 200
    assert session.json()["user"]["email"] == email


def test_token_single_use(api_client: TestClient, mail_capture) -> None:
    email = "once@example.com"
    _request_link(api_client, email)
    token = _extract_token_from_mail(mail_capture.messages[0].body)

    first = api_client.post("/api/v1/magic-links/consume", json={"token": token})
    second = api_client.post("/api/v1/magic-links/consume", json={"token": token})
    assert first.status_code == 200
    assert second.status_code == 400


def test_token_expiry(
    api_client: TestClient,
    mail_capture,
    db_session: Session,
    controllable_clock,
    frozen_at: datetime,
) -> None:
    email = "expired@example.com"
    keyset = load_signing_keyset()
    compact = issue_magic_link(db_session, keyset, email=email)

    controllable_clock.freeze(frozen_at + MAGIC_TOKEN_TTL + timedelta(seconds=1))
    response = api_client.post("/api/v1/magic-links/consume", json={"token": compact})
    assert response.status_code == 400


def test_wrong_audience_and_type(
    db_session: Session,
    api_client: TestClient,
) -> None:
    keyset = load_signing_keyset()
    signing_key = active_signing_key(keyset)
    now = clock.now()
    jti = uuid.uuid4()
    expires = now + MAGIC_TOKEN_TTL

    from app.models.link_token import LinkToken

    db_session.add(
        LinkToken(
            jti=jti,
            kind="magic",
            email="aud@example.com",
            expires_at=expires,
            consumed_at=None,
            created_at=now,
        )
    )
    db_session.commit()

    wrong_aud = jwt.encode(
        {"alg": "ES256", "typ": MAGIC_TOKEN_TYP, "kid": signing_key.kid},
        {
            "iss": settings.jwt_issuer,
            "aud": "gata.invite",
            "sub": "aud@example.com",
            "jti": str(jti),
            "iat": now,
            "exp": expires,
        },
        signing_key,
    )
    response = api_client.post("/api/v1/magic-links/consume", json={"token": wrong_aud})
    assert response.status_code == 400


def test_tampered_token(api_client: TestClient, mail_capture) -> None:
    _request_link(api_client, "tamper@example.com")
    token = _extract_token_from_mail(mail_capture.messages[0].body)
    tampered = token[:-5] + "xxxxx"
    response = api_client.post("/api/v1/magic-links/consume", json={"token": tampered})
    assert response.status_code == 400


def test_non_es256_rejected(api_client: TestClient, mail_capture) -> None:
    _request_link(api_client, "hs@example.com")
    token = _extract_token_from_mail(mail_capture.messages[0].body)
    import base64

    header, payload, signature = token.split(".", 2)
    padded = header + "=" * (-len(header) % 4)
    raw = base64.urlsafe_b64decode(padded)
    tampered_header = raw.replace(b"ES256", b"HS256")
    tampered = (
        base64.urlsafe_b64encode(tampered_header).rstrip(b"=").decode()
        + "."
        + payload
        + "."
        + signature
    )
    response = api_client.post("/api/v1/magic-links/consume", json={"token": tampered})
    assert response.status_code == 400


def test_session_cookie_flags(api_client: TestClient, mail_capture) -> None:
    _request_link(api_client, "cookie@example.com")
    token = _extract_token_from_mail(mail_capture.messages[0].body)
    response = api_client.post("/api/v1/magic-links/consume", json={"token": token})
    assert response.status_code == 200
    header = response.headers.get("set-cookie", "")
    assert SESSION_COOKIE_NAME in header
    assert "httponly" in header.lower()
    assert "secure" in header.lower()
    assert "samesite=lax" in header.lower()


def test_logout_revokes_immediately(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "logout@example.com")
    assert api_client.get("/api/v1/session").status_code == 200

    logout = api_client.post("/api/v1/session/logout")
    assert logout.status_code == 204
    assert api_client.get("/api/v1/session").status_code == 401


def test_session_sliding_expiry(
    api_client: TestClient,
    mail_capture,
    db_session: Session,
    controllable_clock,
) -> None:
    _sign_in(api_client, mail_capture, "slide@example.com")
    assert api_client.get("/api/v1/session").status_code == 200

    anchor = clock.now()
    controllable_clock.freeze(anchor)

    cookie_val = api_client.cookies.get(SESSION_COOKIE_NAME)
    assert cookie_val
    session_id = uuid.UUID(str(cookie_val).split(".", 1)[0])

    advance_session_times_for_tests(
        db_session,
        session_id=session_id,
        last_seen_delta=SESSION_SLIDING_TTL + timedelta(days=1),
        absolute_delta=timedelta(days=0),
    )
    controllable_clock.freeze(anchor + SESSION_SLIDING_TTL + timedelta(days=2))
    assert api_client.get("/api/v1/session").status_code == 401


def test_session_absolute_expiry(
    api_client: TestClient,
    mail_capture,
    db_session: Session,
    controllable_clock,
) -> None:
    _sign_in(api_client, mail_capture, "absolute@example.com")
    anchor = clock.now()
    controllable_clock.freeze(anchor)

    cookie_val = api_client.cookies.get(SESSION_COOKIE_NAME)
    assert cookie_val
    session_id = uuid.UUID(str(cookie_val).split(".", 1)[0])

    from app.auth.constants import SESSION_ABSOLUTE_TTL

    advance_session_times_for_tests(
        db_session,
        session_id=session_id,
        last_seen_delta=timedelta(days=0),
        absolute_delta=SESSION_ABSOLUTE_TTL + timedelta(days=1),
    )
    controllable_clock.freeze(anchor + SESSION_ABSOLUTE_TTL + timedelta(days=2))
    assert api_client.get("/api/v1/session").status_code == 401


def test_magic_link_python_single_use(db_session: Session) -> None:
    keyset = load_signing_keyset()
    email = "pyonce@example.com"
    compact = issue_magic_link(db_session, keyset, email=email)
    inspect_magic_link(db_session, keyset, compact=compact)
    user = consume_magic_link(db_session, keyset, compact=compact)
    assert user.email == email
    with pytest.raises(MagicTokenError):
        consume_magic_link(db_session, keyset, compact=compact)