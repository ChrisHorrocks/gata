from fastapi.testclient import TestClient


def test_health_reads_postgres_via_http(api_client: TestClient) -> None:
    response = api_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


def test_controllable_clock_fixture(controllable_clock, frozen_at) -> None:
    from app.time import Clock

    assert isinstance(controllable_clock, Clock)
    assert controllable_clock.now() == frozen_at


def test_mail_capture_fixture(mail_capture) -> None:
    mail_capture.send(to="a@example.com", subject="link", body="https://example.com/t")
    assert mail_capture.messages[0].to == "a@example.com"
