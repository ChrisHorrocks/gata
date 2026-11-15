# #13 Magic-link sign-in and sessions — build notes

## Open decisions (recorded for the spec)

| Topic | Choice for #13 | Notes |
| --- | --- | --- |
| Session cookie name | `__Host-gata-session` | Value is `{session_id}.{verifier}`; matches ADR 3 `__Host-` prefix pattern. |
| Issuer / audience | `jwt_issuer` env (default dev `http://localhost:5173`); `aud` = `gata.magic`; JWT `typ` = `gata-magic+jwt` | Invite tokens (`gata.invite`) are left to the invites ticket. |
| Signing keys | `JWT_SIGNING_KEYS_JSON` or `JWT_SIGNING_KEYS_FILE`; dev/tests fall back to `backend/tests/fixtures/signing_keys.json` | Never commit production private keys. |
| Magic-link email copy | Subject “Sign in to gata”; plain-text body with confirm URL `{app_public_url}/sign-in/confirm?token=…` | HTML templates and branding are out of scope. |
| Previous unused links | Marking earlier unused magic-link rows consumed when issuing a new link for the same email | Matches research #4 hygiene; rate limits are #14. |
| Local cookie transport | Vite proxies `/api` so the browser stays same-origin; session cookie is `Secure` (works on `localhost` in Chromium) | CI `TestClient` uses `https://testserver` so `Secure` cookies are sent in pytest. |