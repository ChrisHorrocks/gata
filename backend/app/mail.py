"""SMTP-edge mail helper; tests stub or capture at this boundary."""

from dataclasses import dataclass, field
from email.message import EmailMessage


@dataclass
class CapturedEmail:
    to: str
    subject: str
    body: str


@dataclass
class MailCapture:
    """In-memory capture for tests (later tickets read links from captured mail)."""

    messages: list[CapturedEmail] = field(default_factory=list)

    def send(self, *, to: str, subject: str, body: str) -> None:
        self.messages.append(CapturedEmail(to=to, subject=subject, body=body))


def build_message(*, to: str, subject: str, body: str) -> EmailMessage:
    msg = EmailMessage()
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    return msg
