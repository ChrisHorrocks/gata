"""Itinerary days API tests (#19)."""

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
                "TRUNCATE TABLE days, memberships, trips, sessions, link_tokens, users "
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


def _create_trip(client: TestClient, *, start_date: str = "2026-06-01") -> dict:
    response = client.post(
        "/api/v1/trips",
        json={"name": "Cairngorms", "start_date": start_date},
        headers=_write_headers(client),
    )
    assert response.status_code == 201
    return response.json()


def _create_day(
    client: TestClient,
    trip_id: str,
    *,
    kind: str = "walking",
    distance_km: str | None = None,
    ascent_m: int | None = None,
) -> dict:
    payload: dict = {"kind": kind}
    if distance_km is not None:
        payload["distance_km"] = distance_km
    if ascent_m is not None:
        payload["ascent_m"] = ascent_m
    response = client.post(
        f"/api/v1/trips/{trip_id}/days",
        json=payload,
        headers=_write_headers(client),
    )
    assert response.status_code == 201
    return response.json()


def test_list_days_dates_and_totals(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)
    trip_id = trip["id"]

    day_one = _create_day(api_client, trip_id, distance_km="12.5", ascent_m=450)
    _create_day(api_client, trip_id, kind="rest")
    day_three = _create_day(api_client, trip_id, distance_km="8", ascent_m=200)

    listed = api_client.get(f"/api/v1/trips/{trip_id}/days")
    assert listed.status_code == 200
    body = listed.json()
    assert body["total_distance_km"] == "20.50"
    assert body["total_ascent_m"] == 650
    days = body["days"]
    assert len(days) == 3
    assert days[0]["id"] == day_one["id"]
    assert days[0]["date"] == "2026-06-01"
    assert days[1]["date"] == "2026-06-02"
    assert days[1]["kind"] == "rest"
    assert days[1]["distance_km"] is None
    assert days[2]["id"] == day_three["id"]
    assert days[2]["date"] == "2026-06-03"


def test_validation_rejects_negative_and_rest_metrics(
    api_client: TestClient, mail_capture
) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)
    trip_id = trip["id"]

    bad_walk = api_client.post(
        f"/api/v1/trips/{trip_id}/days",
        json={"kind": "walking", "distance_km": "-1"},
        headers=_write_headers(api_client),
    )
    assert bad_walk.status_code == 422

    bad_rest = api_client.post(
        f"/api/v1/trips/{trip_id}/days",
        json={"kind": "rest", "distance_km": "1"},
        headers=_write_headers(api_client),
    )
    assert bad_rest.status_code == 422


def test_patch_delete_and_reorder_version_conflicts(
    api_client: TestClient, mail_capture
) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)
    trip_id = trip["id"]
    day_a = _create_day(api_client, trip_id)
    day_b = _create_day(api_client, trip_id)

    stale_patch = api_client.patch(
        f"/api/v1/trips/{trip_id}/days/{day_a['id']}",
        json={"version": 1, "distance_km": "99"},
        headers=_write_headers(api_client),
    )
    assert stale_patch.status_code == 200
    assert stale_patch.json()["version"] == 2

    conflict = api_client.patch(
        f"/api/v1/trips/{trip_id}/days/{day_a['id']}",
        json={"version": 1, "distance_km": "1"},
        headers=_write_headers(api_client),
    )
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["current"]["version"] == 2

    ok_other = api_client.patch(
        f"/api/v1/trips/{trip_id}/days/{day_b['id']}",
        json={"version": 1, "ascent_m": 100},
        headers=_write_headers(api_client),
    )
    assert ok_other.status_code == 200

    delete_conflict = api_client.request(
        "DELETE",
        f"/api/v1/trips/{trip_id}/days/{day_b['id']}",
        json={"version": 1},
        headers=_write_headers(api_client),
    )
    assert delete_conflict.status_code == 409

    reorder = api_client.put(
        f"/api/v1/trips/{trip_id}/days/order",
        json={
            "order": [
                {"id": day_b["id"], "version": ok_other.json()["version"]},
                {"id": day_a["id"], "version": 1},
            ]
        },
        headers=_write_headers(api_client),
    )
    assert reorder.status_code == 409
    assert reorder.json()["detail"]["message"] == "Version conflict"


def test_reorder_success(api_client: TestClient, mail_capture) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)
    trip_id = trip["id"]
    day_a = _create_day(api_client, trip_id)
    day_b = _create_day(api_client, trip_id)

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
    days = reordered.json()["days"]
    assert days[0]["id"] == day_b["id"]
    assert days[0]["date"] == "2026-06-01"
    assert days[1]["id"] == day_a["id"]
    assert days[1]["date"] == "2026-06-02"


def test_non_member_gets_404(api_client: TestClient, mail_capture, db_session) -> None:
    _sign_in(api_client, mail_capture, "alice@example.com")
    trip = _create_trip(api_client)
    trip_id = trip["id"]
    day = _create_day(api_client, trip_id)

    bob = User(email="bob@example.com", emergency_contacts=[], created_at=datetime.now(UTC))
    db_session.add(bob)
    db_session.commit()

    _sign_in(api_client, mail_capture, "bob@example.com")
    missing = api_client.get(f"/api/v1/trips/{trip_id}/days")
    assert missing.status_code == 404

    _sign_in(api_client, mail_capture, "alice@example.com")
    _sign_in(api_client, mail_capture, "bob@example.com")
    missing_day = api_client.patch(
        f"/api/v1/trips/{trip_id}/days/{day['id']}",
        json={"version": 1, "ascent_m": 1},
        headers=_write_headers(api_client),
    )
    assert missing_day.status_code == 404