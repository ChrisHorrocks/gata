"""Trip create/list/settings/delete API tests (#16)."""

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
                "TRUNCATE TABLE memberships, trips, sessions, link_tokens, users "
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


def _create_trip(
    client: TestClient,
    *,
    name: str = "Cairngorms 2026",
    start_date: str = "2026-06-01",
) -> dict:
    response = client.post(
        "/api/v1/trips",
        json={"name": name, "start_date": start_date},
        headers=safe_write_headers(csrf_token=_csrf(client)),
    )
    assert response.status_code == 201
    return response.json()


def test_create_trip_organiser_and_list(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)

    assert trip["name"] == "Cairngorms 2026"
    assert trip["start_date"] == "2026-06-01"
    assert trip["role"] == "organiser"
    assert trip["version"] == 1

    listed = api_client.get("/api/v1/trips")
    assert listed.status_code == 200
    trips = listed.json()["trips"]
    assert len(trips) == 1
    assert trips[0]["id"] == trip["id"]


def test_get_trip_404_when_not_member(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)

    _sign_in(api_client, mail_capture, "bob@example.com")
    missing = api_client.get(f"/api/v1/trips/{trip['id']}")
    assert missing.status_code == 404


def test_patch_updates_with_version(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)

    patched = api_client.patch(
        f"/api/v1/trips/{trip['id']}",
        json={
            "version": trip["version"],
            "name": "Renamed trip",
            "emergency_notes": "Back by Sunday",
        },
        headers=safe_write_headers(csrf_token=_csrf(api_client)),
    )
    assert patched.status_code == 200
    body = patched.json()
    assert body["name"] == "Renamed trip"
    assert body["emergency_notes"] == "Back by Sunday"
    assert body["version"] == 2


def test_patch_stale_version_returns_409_with_current(
    api_client: TestClient, mail_capture
) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)

    first = api_client.patch(
        f"/api/v1/trips/{trip['id']}",
        json={"version": 1, "name": "First save"},
        headers=safe_write_headers(csrf_token=_csrf(api_client)),
    )
    assert first.status_code == 200

    conflict = api_client.patch(
        f"/api/v1/trips/{trip['id']}",
        json={"version": 1, "name": "Stale save"},
        headers=safe_write_headers(csrf_token=_csrf(api_client)),
    )
    assert conflict.status_code == 409
    detail = conflict.json()["detail"]
    assert detail["message"] == "Version conflict"
    assert detail["current"]["name"] == "First save"
    assert detail["current"]["version"] == 2


def test_delete_organiser_only(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)
    trip_id = trip["id"]

    # Bob cannot see the trip to add as member in v1 without invites — simulate organiser trip
    # with two users by using raw membership is out of scope; invite ticket adds members.
    # Add bob manually via second organiser account pattern: create second trip is insufficient.
    # Use API: alice invites later; for delete-403 test, we need a member who isn't organiser.
    # Create trip as alice, sign in bob, 404 on delete (not a member) covers non-member.
    forbidden = api_client.request(
        "DELETE",
        f"/api/v1/trips/{uuid.uuid4()}",
        json={"version": 1},
        headers=safe_write_headers(csrf_token=_csrf(api_client)),
    )
    assert forbidden.status_code == 404

    deleted = api_client.request(
        "DELETE",
        f"/api/v1/trips/{trip_id}",
        json={"version": trip["version"]},
        headers=safe_write_headers(csrf_token=_csrf(api_client)),
    )
    assert deleted.status_code == 204

    listed = api_client.get("/api/v1/trips")
    assert listed.json()["trips"] == []


def test_delete_member_gets_403(
    api_client: TestClient,
    mail_capture,
    db_session,
) -> None:
    from datetime import UTC, datetime

    from app.models.membership import Membership, MembershipRole
    from app.models.user import User

    _sign_in(api_client, mail_capture, "alice@example.com")
    trip_json = _create_trip(api_client)

    bob = User(email="bob@example.com", created_at=datetime.now(UTC))
    db_session.add(bob)
    db_session.flush()
    db_session.add(
        Membership(
            trip_id=uuid.UUID(trip_json["id"]),
            user_id=bob.id,
            role=MembershipRole.member.value,
            joined_at=datetime.now(UTC),
        )
    )
    db_session.commit()

    _sign_in(api_client, mail_capture, "bob@example.com")
    response = api_client.request(
        "DELETE",
        f"/api/v1/trips/{trip_json['id']}",
        json={"version": trip_json["version"]},
        headers=safe_write_headers(csrf_token=_csrf(api_client)),
    )
    assert response.status_code == 403

    still_there = api_client.get(f"/api/v1/trips/{trip_json['id']}")
    assert still_there.status_code == 200


def test_requires_session(api_client: TestClient) -> None:
    assert api_client.get("/api/v1/trips").status_code == 401