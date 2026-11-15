from datetime import timedelta

CSRF_HEADER_NAME = "X-CSRF-Token"

MAGIC_TOKEN_TYP = "gata-magic+jwt"
MAGIC_TOKEN_AUD = "gata.magic"
LINK_KIND_MAGIC = "magic"

MAGIC_TOKEN_TTL = timedelta(minutes=15)
SESSION_SLIDING_TTL = timedelta(days=30)
SESSION_ABSOLUTE_TTL = timedelta(days=90)

MAGIC_LINK_RESPONSE_MESSAGE = (
    "If that address can sign in, we have sent a link. It expires in 15 minutes."
)

MAGIC_LINK_RATE_LIMIT_PER_EMAIL = 5
MAGIC_LINK_RATE_LIMIT_PER_IP = 20
MAGIC_LINK_RATE_LIMIT_WINDOW = timedelta(hours=1)