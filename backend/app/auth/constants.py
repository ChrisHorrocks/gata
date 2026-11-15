from datetime import timedelta

SESSION_COOKIE_NAME = "__Host-gata-session"

MAGIC_TOKEN_TYP = "gata-magic+jwt"
MAGIC_TOKEN_AUD = "gata.magic"
LINK_KIND_MAGIC = "magic"

MAGIC_TOKEN_TTL = timedelta(minutes=15)
SESSION_SLIDING_TTL = timedelta(days=30)
SESSION_ABSOLUTE_TTL = timedelta(days=90)

MAGIC_LINK_RESPONSE_MESSAGE = (
    "If that address can sign in, we have sent a link. It expires in 15 minutes."
)