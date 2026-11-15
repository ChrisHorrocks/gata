from __future__ import annotations

import json
from pathlib import Path

from joserfc.jwk import ECKey, KeySet

from app.config import settings

_DEV_FIXTURE = (
    Path(__file__).resolve().parent.parent.parent / "tests" / "fixtures" / "signing_keys.json"
)


def load_signing_keyset() -> KeySet:
    if settings.jwt_signing_keys_file:
        raw = Path(settings.jwt_signing_keys_file).read_text(encoding="utf-8")
    elif settings.jwt_signing_keys_json:
        raw = settings.jwt_signing_keys_json
    else:
        raw = _DEV_FIXTURE.read_text(encoding="utf-8")
    data = json.loads(raw)
    keys = tuple(ECKey.import_key(k) for k in data["keys"])
    return KeySet(list(keys))


def active_signing_key(keyset: KeySet) -> ECKey:
    for key in keyset.keys:
        if isinstance(key, ECKey):
            key.ensure_kid()
            return key
    msg = "No ES256 signing key in keyset"
    raise RuntimeError(msg)