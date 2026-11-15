"""Mail settings and SMTP message shape (Compose / Mailpit path)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.mail import SmtpMailer, build_message
from app.startup import validate_runtime_settings

# Environment block matching docker-compose.yml backend service (minus secrets).
COMPOSE_BACKEND_ENV = {
    "DATABASE_URL": "postgresql+psycopg://gata:gata@postgres:5432/gata",
    "SMTP_HOST": "mailpit",
    "SMTP_PORT": "1025",
    "APP_PUBLIC_URL": "http://localhost:5173",
    "JWT_ISSUER": "http://localhost:5173",
}


def test_build_message_includes_from_header() -> None:
    msg = build_message(
        from_addr="noreply@example.com",
        to="walker@example.com",
        subject="Sign in",
        body="link",
    )
    assert msg["From"] == "noreply@example.com"
    assert msg["To"] == "walker@example.com"


def test_compose_env_defaults_smtp_from(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in (
        "SMTP_FROM",
        "SMTP_HOST",
        "SMTP_PORT",
        "APP_PUBLIC_URL",
        "JWT_ISSUER",
        "DATABASE_URL",
    ):
        monkeypatch.delenv(key, raising=False)
    for key, value in COMPOSE_BACKEND_ENV.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv("SMTP_FROM", "noreply@example.com")

    configured = Settings(_env_file=None)
    assert configured.smtp_host == "mailpit"
    assert str(configured.smtp_from) == "noreply@example.com"

    msg = build_message(
        from_addr=str(configured.smtp_from),
        to="walker@example.com",
        subject="Sign in to gata",
        body="https://example.com",
    )
    assert msg["From"] == "noreply@example.com"


def test_compose_env_without_smtp_from_uses_dev_default(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in (
        "SMTP_FROM",
        "SMTP_HOST",
        "SMTP_PORT",
        "APP_PUBLIC_URL",
        "JWT_ISSUER",
        "DATABASE_URL",
    ):
        monkeypatch.delenv(key, raising=False)
    for key, value in COMPOSE_BACKEND_ENV.items():
        monkeypatch.setenv(key, value)

    configured = Settings(_env_file=None)
    assert str(configured.smtp_from) == "noreply@example.com"


def test_smtp_from_literal_none_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SMTP_FROM", "None")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_smtp_mailer_passes_from_to_send_message() -> None:
    mailer = SmtpMailer(host="mailpit", port=1025, from_addr="noreply@example.com")
    smtp = MagicMock()
    smtp_class = MagicMock()
    smtp_class.return_value.__enter__.return_value = smtp

    with patch("app.mail.smtplib.SMTP", smtp_class):
        mailer.send(to="walker@example.com", subject="Sign in", body="hello")

    smtp.send_message.assert_called_once()
    args, kwargs = smtp.send_message.call_args
    assert kwargs["from_addr"] == "noreply@example.com"
    assert kwargs["to_addrs"] == ["walker@example.com"]
    assert args[0]["From"] == "noreply@example.com"


def test_validate_runtime_settings_with_compose_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in (
        "SMTP_FROM",
        "SMTP_HOST",
        "SMTP_PORT",
        "APP_PUBLIC_URL",
        "JWT_ISSUER",
        "DATABASE_URL",
    ):
        monkeypatch.delenv(key, raising=False)
    for key, value in COMPOSE_BACKEND_ENV.items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv("SMTP_FROM", "noreply@example.com")
    configured = Settings(_env_file=None)
    validate_runtime_settings(configured)