"""Gear library API tests (#24)."""

from __future__ import annotations

import re
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.auth.cookie_policy import get_cookie_policy
from tests.conftest import safe_write_headers


@pytest.fixture(autouse=True)
def clean_tables(migrated_database: str) -> None:
    engine = create_engine(migrated_database)
    with engine.begin() as conn:
        conn.execute(
            text(
                "TRUNCATE TABLE gear_library_items, sessions, link_tokens, "
                "users RESTART IDENTITY CASCADE"
            )
        )
    engine.dispose()


def _extract_token_from_mail(body: str) -> str:
    match = re.search(r"token=([^ \n]+)", body)
    assert match
    return match.group(1)


def _request_link(client: TestClient, email: str) -> None:
    response = client.post(
        "/api/v1/magic-links",
        json={"email": email},
        headers=safe_write_headers(client_ip="203.0.113.2"),
    )
    assert response.status_code == 200


def _sign_in(client: TestClient, mail_capture, email: str) -> None:
    _request_link(client, email)
    assert len(mail_capture.messages) == 1
    token = _extract_token_from_mail(mail_capture.messages[0].body)
    response = client.post(
        "/api/v1/magic-links/consume",
        json={"token": token},
        headers=safe_write_headers(),
    )
    assert response.status_code == 200


def _csrf(client: TestClient) -> str:
    policy = get_cookie_policy()
    token = client.cookies.get(policy.csrf_name)
    assert token
    return str(token)


def test_gear_requires_auth(api_client: TestClient) -> None:
    response = api_client.get("/api/v1/me/gear")
    assert response.status_code == 401


def test_gear_crud_and_validation(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "gear@example.com")
    csrf = _csrf(api_client)

    create = api_client.post(
        "/api/v1/me/gear",
        json={"name": "  Tent  ", "weight_grams": 2100, "category": "Shelter"},
        headers=safe_write_headers(csrf_token=csrf),
    )
    assert create.status_code == 201
    item = create.json()
    assert item["name"] == "Tent"
    assert item["weight_grams"] == 2100
    assert item["category"] == "Shelter"
    item_id = item["id"]

    bad_weight = api_client.post(
        "/api/v1/me/gear",
        json={"name": "Heavy", "weight_grams": -1},
        headers=safe_write_headers(csrf_token=csrf),
    )
    assert bad_weight.status_code == 422

    bad_name = api_client.post(
        "/api/v1/me/gear",
        json={"name": "   ", "weight_grams": 0},
        headers=safe_write_headers(csrf_token=csrf),
    )
    assert bad_name.status_code == 422

    listed = api_client.get("/api/v1/me/gear")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    patch = api_client.patch(
        f"/api/v1/me/gear/{item_id}",
        json={"weight_grams": 2000, "category": None},
        headers=safe_write_headers(csrf_token=csrf),
    )
    assert patch.status_code == 200
    assert patch.json()["weight_grams"] == 2000
    assert patch.json()["category"] is None

    delete = api_client.delete(
        f"/api/v1/me/gear/{item_id}",
        headers=safe_write_headers(csrf_token=csrf),
    )
    assert delete.status_code == 204
    assert api_client.get("/api/v1/me/gear").json() == []


def test_gear_cross_user_isolation(
    api_client: TestClient,
    mail_capture,
    db_session,
) -> None:
    from app.models.gear import GearLibraryItem
    from app.models.user import User
    from app.time import clock

    now = clock.now()
    victim = User(email="victim@example.com", display_name=None, created_at=now)
    db_session.add(victim)
    db_session.flush()
    stolen_id = uuid.uuid4()
    db_session.add(
        GearLibraryItem(
            id=stolen_id,
            user_id=victim.id,
            name="Victim stove",
            weight_grams=350,
            category="Cooking",
            created_at=now,
        )
    )
    db_session.commit()

    _sign_in(api_client, mail_capture, "attacker@example.com")
    csrf = _csrf(api_client)

    for method, path, body in [
        ("patch", f"/api/v1/me/gear/{stolen_id}", {"name": "Hacked"}),
        ("delete", f"/api/v1/me/gear/{stolen_id}", None),
    ]:
        if method == "patch":
            response = api_client.patch(
                path,
                json=body,
                headers=safe_write_headers(csrf_token=csrf),
            )
        else:
            response = api_client.delete(path, headers=safe_write_headers(csrf_token=csrf))
        assert response.status_code == 404

    listed = api_client.get("/api/v1/me/gear")
    assert listed.status_code == 200
    assert listed.json() == []