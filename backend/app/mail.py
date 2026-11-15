"""SMTP-edge mail helper; tests stub or capture at this boundary."""

from __future__ import annotations

import smtplib
from dataclasses import dataclass, field
from email.message import EmailMessage
from typing import Protocol

from app.config import settings


class MailSender(Protocol):
    def send(self, *, to: str, subject: str, body: str) -> None: ...


@dataclass
class CapturedEmail:
    to: str
    subject: str
    body: str


@dataclass
class MailCapture:
    """In-memory capture for tests (read magic links from captured mail)."""

    messages: list[CapturedEmail] = field(default_factory=list)

    def send(self, *, to: str, subject: str, body: str) -> None:
        self.messages.append(CapturedEmail(to=to, subject=subject, body=body))


@dataclass
class SmtpMailer:
    host: str
    port: int
    from_addr: str

    def send(self, *, to: str, subject: str, body: str) -> None:
        msg = build_message(from_addr=self.from_addr, to=to, subject=subject, body=body)
        with smtplib.SMTP(self.host, self.port) as smtp:
            smtp.send_message(msg, from_addr=self.from_addr, to_addrs=[to])


def build_message(*, from_addr: str, to: str, subject: str, body: str) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = from_addr
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    return msg


_mailer: MailSender = SmtpMailer(
    host=settings.smtp_host,
    port=settings.smtp_port,
    from_addr=str(settings.smtp_from),
)


def get_mailer() -> MailSender:
    return _mailer


def set_mailer(mailer: MailSender) -> None:
    global _mailer
    _mailer = mailer