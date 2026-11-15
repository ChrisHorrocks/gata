import os

# Tests must not rely on app code loading secrets from test fixture paths.
os.environ.setdefault("CSRF_SECRET", "test-csrf-secret-do-not-use-in-production")

from collections.abc import Generator
from datetime import UTC, datetime

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from alembic import command
from app.auth.constants import CSRF_HEADER_NAME
from app.config import settings
from app.db import get_db
from app.deps import get_mailer
from app.mail import MailCapture, SmtpMailer, set_mailer
from app.main import app
from app.time import Clock, clock


def safe_write_headers(
    *, csrf_token: str | None = None, client_ip: str | None = None
) -> dict[str, str]:
    headers = {
        "Origin": settings.app_public_url.rstrip("/"),
        "Sec-Fetch-Site": "same-origin",
    }
    if csrf_token is not None:
        headers[CSRF_HEADER_NAME] = csrf_token
    if client_ip is not None:
        headers["X-Forwarded-For"] = client_ip
    return headers


@pytest.fixture(scope="session")
def database_url() -> str:
    import os

    url = os.environ.get("DATABASE_URL")
    assert url, "DATABASE_URL must be set for tests"
    return url


@pytest.fixture(scope="session")
def migrated_database(database_url: str) -> Generator[str, None, None]:
    db_url = database_url
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(alembic_cfg, "head")
    yield db_url


@pytest.fixture
def db_session(migrated_database: str) -> Generator[Session, None, None]:
    engine = create_engine(migrated_database)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture(autouse=True)
def reset_clock() -> Generator[None, None, None]:
    clock.unfreeze()
    yield
    clock.unfreeze()


@pytest.fixture
def controllable_clock() -> Generator[Clock, None, None]:
    clock.unfreeze()
    yield clock
    clock.unfreeze()


@pytest.fixture
def frozen_at(controllable_clock: Clock) -> datetime:
    instant = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
    controllable_clock.freeze(instant)
    return instant


@pytest.fixture
def mail_capture() -> MailCapture:
    return MailCapture()


@pytest.fixture(autouse=True)
def capture_mail(mail_capture: MailCapture) -> Generator[MailCapture, None, None]:
    set_mailer(mail_capture)
    app.dependency_overrides[get_mailer] = lambda: mail_capture
    yield mail_capture
    app.dependency_overrides.pop(get_mailer, None)
    set_mailer(
        SmtpMailer(
            host=settings.smtp_host,
            port=settings.smtp_port,
            from_addr=str(settings.smtp_from),
        )
    )


@pytest.fixture
def api_client(migrated_database: str) -> Generator[TestClient, None, None]:
    engine = create_engine(migrated_database)
    session_factory = sessionmaker(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, base_url="https://testserver") as client:
        yield client
    app.dependency_overrides.clear()
    engine.dispose()


