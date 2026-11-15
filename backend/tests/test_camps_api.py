"""Camps API tests (#21)."""

from __future__ import annotations

import re
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.auth.cookie_policy import get_cookie_policy
from app.models.user import User
from tests.conftest import safe_write_headers


@pytest.fixture(autouse=True)
def clean_tables(migrated_database: str) -> None:
    engine = create_engine(migrated_database)
    with engine.begin() as conn:
        conn.execute(
            text(
                "TRUNCATE TABLE camps, days, memberships, trips, sessions, link_tokens, users "
                "RESTART IDENTITY CASCADE"
            )
        )
    engine.dispose()


def _extract_token_from_mail(body: str) -> str:
    match = re.search(r"token=([^ \n]+)", body)
    assert match
    return match.group(1)


def _sign_in(client: TestClient, mail_capture, email: str) -> None:
    response = client.post(
        "/api/v1/magic-links",
        json={"email": email},
        headers=safe_write_headers(client_ip="203.0.113.2"),
    )
    assert response.status_code == 200
    mail = next(m for m in reversed(mail_capture.messages) if m.to == email)
    token = _extract_token_from_mail(mail.body)
    consume = client.post(
        "/api/v1/magic-links/consume",
        json={"token": token},
        headers=safe_write_headers(),
    )
    assert consume.status_code == 200


def _csrf(client: TestClient) -> str:
    policy = get_cookie_policy()
    token = client.cookies.get(policy.csrf_name)
    assert token
    return str(token)


def _write_headers(client: TestClient) -> dict[str, str]:
    return safe_write_headers(csrf_token=_csrf(client))


def _create_trip(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/trips",
        json={"name": "Cairngorms", "start_date": "2026-06-01"},
        headers=_write_headers(client),
    )
    assert response.status_code == 201
    return response.json()


def _create_day(client: TestClient, trip_id: str, *, kind: str = "walking") -> dict:
    response = client.post(
        f"/api/v1/trips/{trip_id}/days",
        json={"kind": kind},
        headers=_write_headers(client),
    )
    assert response.status_code == 201
    return response.json()


def _create_camp(
    client: TestClient,
    trip_id: str,
    *,
    day_id: str,
    lat: float = 57.1,
    lng: float = -3.9,
    name: str = "Camp 1",
) -> dict:
    response = client.post(
        f"/api/v1/trips/{trip_id}/camps",
        json={
            "day_id": day_id,
            "name": name,
            "latitude": lat,
            "longitude": lng,
            "notes": "water nearby",
        },
        headers=_write_headers(client),
    )
    assert response.status_code == 201
    return response.json()


def test_rest_day_cannot_have_camp_and_pins_follow_day_order(
    api_client: TestClient, mail_capture
) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)
    trip_id = trip["id"]
    walk_one = _create_day(api_client, trip_id)
    rest = _create_day(api_client, trip_id, kind="rest")
    walk_two = _create_day(api_client, trip_id)

    camp_one = _create_camp(api_client, trip_id, day_id=walk_one["id"], name="Start")
    camp_two = _create_camp(
        api_client, trip_id, day_id=walk_two["id"], lat=57.2, lng=-3.8, name="High camp"
    )

    rejected = api_client.post(
        f"/api/v1/trips/{trip_id}/camps",
        json={
            "day_id": rest["id"],
            "name": "Should fail",
            "latitude": 57.0,
            "longitude": -3.0,
        },
        headers=_write_headers(api_client),
    )
    assert rejected.status_code == 422

    listed = api_client.get(f"/api/v1/trips/{trip_id}/camps")
    assert listed.status_code == 200
    camps = listed.json()["camps"]
    assert len(camps) == 2
    assert camps[0]["id"] == camp_one["id"]
    assert camps[0]["pin_number"] == 1
    assert camps[1]["id"] == camp_two["id"]
    assert camps[1]["pin_number"] == 2


def test_delete_day_removes_camp(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)
    trip_id = trip["id"]
    day = _create_day(api_client, trip_id)
    _create_camp(api_client, trip_id, day_id=day["id"])

    deleted = api_client.request(
        "DELETE",
        f"/api/v1/trips/{trip_id}/days/{day['id']}",
        json={"version": day["version"]},
        headers=_write_headers(api_client),
    )
    assert deleted.status_code == 204

    listed = api_client.get(f"/api/v1/trips/{trip_id}/camps")
    assert listed.json()["camps"] == []


def test_walking_to_rest_drops_camp(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)
    trip_id = trip["id"]
    day = _create_day(api_client, trip_id)
    _create_camp(api_client, trip_id, day_id=day["id"])

    patched = api_client.patch(
        f"/api/v1/trips/{trip_id}/days/{day['id']}",
        json={"version": day["version"], "kind": "rest"},
        headers=_write_headers(api_client),
    )
    assert patched.status_code == 200

    listed = api_client.get(f"/api/v1/trips/{trip_id}/camps")
    assert listed.json()["camps"] == []


def test_reorder_updates_pin_numbers(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)
    trip_id = trip["id"]
    day_a = _create_day(api_client, trip_id)
    day_b = _create_day(api_client, trip_id)
    camp_a = _create_camp(api_client, trip_id, day_id=day_a["id"], name="A")
    camp_b = _create_camp(api_client, trip_id, day_id=day_b["id"], name="B")

    reordered = api_client.put(
        f"/api/v1/trips/{trip_id}/days/order",
        json={
            "order": [
                {"id": day_b["id"], "version": day_b["version"]},
                {"id": day_a["id"], "version": day_a["version"]},
            ]
        },
        headers=_write_headers(api_client),
    )
    assert reordered.status_code == 200

    listed = api_client.get(f"/api/v1/trips/{trip_id}/camps")
    camps = listed.json()["camps"]
    assert camps[0]["id"] == camp_b["id"]
    assert camps[0]["pin_number"] == 1
    assert camps[1]["id"] == camp_a["id"]
    assert camps[1]["pin_number"] == 2


def test_camp_version_conflict_and_permissions(
    api_client: TestClient, mail_capture, db_session
) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)
    trip_id = trip["id"]
    day = _create_day(api_client, trip_id)
    camp = _create_camp(api_client, trip_id, day_id=day["id"])

    updated = api_client.patch(
        f"/api/v1/trips/{trip_id}/camps/{camp['id']}",
        json={"version": camp["version"], "notes": "midge hell"},
        headers=_write_headers(api_client),
    )
    assert updated.status_code == 200
    assert updated.json()["notes"] == "midge hell"

    conflict = api_client.patch(
        f"/api/v1/trips/{trip_id}/camps/{camp['id']}",
        json={"version": camp["version"], "notes": "stale"},
        headers=_write_headers(api_client),
    )
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["current"]["notes"] == "midge hell"

    bob = User(email="bob@example.com", emergency_contacts=[], created_at=datetime.now(UTC))
    db_session.add(bob)
    db_session.commit()

    _sign_in(api_client, mail_capture, "bob@example.com")
    missing = api_client.get(f"/api/v1/trips/{trip_id}/camps")
    assert missing.status_code == 404