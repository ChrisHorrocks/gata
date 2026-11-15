"""Profile GET/PATCH /me (#15)."""

from __future__ import annotations

import re

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.auth.cookie_policy import get_cookie_policy
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


def _sign_in(client: TestClient, mail_capture, email: str) -> None:
    before = len(mail_capture.messages)
    client.post(
        "/api/v1/magic-links",
        json={"email": email},
        headers=safe_write_headers(client_ip="203.0.113.9"),
    )
    assert len(mail_capture.messages) == before + 1
    token = _extract_token_from_mail(mail_capture.messages[-1].body)
    response = client.post(
        "/api/v1/magic-links/consume",
        json={"token": token},
        headers=safe_write_headers(),
    )
    assert response.status_code == 200


def _csrf_headers(client: TestClient) -> dict[str, str]:
    policy = get_cookie_policy()
    csrf = client.cookies.get(policy.csrf_name)
    assert csrf
    return safe_write_headers(csrf_token=str(csrf))


def test_get_and_patch_me(api_client: TestClient, mail_capture) -> None:
    email = "profile@example.com"
    _sign_in(api_client, mail_capture, email)

    initial = api_client.get("/api/v1/me")
    assert initial.status_code == 200
    body = initial.json()
    assert body["email"] == email
    assert body["display_name"] is None
    assert body["emergency_contacts"] == []

    patch = api_client.patch(
        "/api/v1/me",
        json={
            "display_name": "Alex Hiker",
            "emergency_contacts": [
                {
                    "name": "Sam Lee",
                    "relationship": "Partner",
                    "phone": "+44 7700 900111",
                },
            ],
        },
        headers=_csrf_headers(api_client),
    )
    assert patch.status_code == 200
    updated = patch.json()
    assert updated["display_name"] == "Alex Hiker"
    assert len(updated["emergency_contacts"]) == 1
    assert updated["emergency_contacts"][0]["name"] == "Sam Lee"

    session = api_client.get("/api/v1/session")
    assert session.json()["user"]["display_name"] == "Alex Hiker"


def test_patch_two_contacts(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "two@example.com")
    response = api_client.patch(
        "/api/v1/me",
        json={
            "emergency_contacts": [
                {"name": "A", "relationship": "Sibling", "phone": "111"},
                {"name": "B", "relationship": "Friend", "phone": "222"},
            ],
        },
        headers=_csrf_headers(api_client),
    )
    assert response.status_code == 200
    assert len(response.json()["emergency_contacts"]) == 2


def test_third_contact_rejected(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "three@example.com")
    response = api_client.patch(
        "/api/v1/me",
        json={
            "emergency_contacts": [
                {"name": "A", "relationship": "A", "phone": "1"},
                {"name": "B", "relationship": "B", "phone": "2"},
                {"name": "C", "relationship": "C", "phone": "3"},
            ],
        },
        headers=_csrf_headers(api_client),
    )
    assert response.status_code == 422


def test_blank_contact_fields_rejected(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "blank@example.com")
    response = api_client.patch(
        "/api/v1/me",
        json={
            "emergency_contacts": [
                {"name": "Pat", "relationship": " ", "phone": "123"},
            ],
        },
        headers=_csrf_headers(api_client),
    )
    assert response.status_code == 422


def test_me_requires_session(api_client: TestClient) -> None:
    assert api_client.get("/api/v1/me").status_code == 401
    assert (
        api_client.patch(
            "/api/v1/me",
            json={"display_name": "X"},
            headers=safe_write_headers(csrf_token="bogus"),
        ).status_code
        == 401
    )


def test_profiles_isolated_per_session(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    api_client.patch(
        "/api/v1/me",
        json={"display_name": "Alice Only"},
        headers=_csrf_headers(api_client),
    )
    assert api_client.get("/api/v1/me").json()["display_name"] == "Alice Only"

    api_client.post(
        "/api/v1/session/logout",
        headers=_csrf_headers(api_client),
    )

    _sign_in(api_client, mail_capture, "bob@example.com")
    bob = api_client.get("/api/v1/me").json()
    assert bob["email"] == "bob@example.com"
    assert bob["display_name"] is None
    assert bob["emergency_contacts"] == []