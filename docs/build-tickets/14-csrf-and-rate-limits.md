# #14 CSRF protection and magic-link rate limiting — build notes

## Limits (as shipped)

| Bucket | Window | Max requests |
| --- | --- | --- |
| Email (normalised) | Rolling 1 hour | 5 |
| Client IP (`X-Forwarded-For` first hop, else TCP peer) | Rolling 1 hour | 20 |

When limited, `POST /api/v1/magic-links` returns **429** with the same JSON body as success (`message` only), and does not send mail.

Counts use `link_tokens` rows for kind `magic` with `created_at` in the window (including rows later marked consumed when a newer link is issued).

## CSRF

- **Fetch Metadata**: state-changing methods reject `Sec-Fetch-Site: cross-site`. When that header is absent, `Origin` must match `APP_PUBLIC_URL` (scheme, host, port).
- **Double-submit**: on sign-in (`magic-links/consume`), the API sets `__Host-gata-csrf` (readable) to an HMAC-SHA256 hex digest of `{session_id}.{verifier}` keyed by `CSRF_SECRET` / `CSRF_SECRET_FILE` (tests use `backend/tests/fixtures/csrf_secret.txt`).
- **Authenticated writes**: any state-changing request that includes a parseable session cookie must send matching values in `X-CSRF-Token` and the CSRF cookie. Magic-link endpoints stay exempt so a retry while already signed in still hits token validation instead of CSRF.
- **Frontend**: `apiRequest` attaches the header on POST/PUT/PATCH/DELETE when the cookie is present.

## Ponytail scope

- `.cursor/skills/ponytail` was not present in the repository; security and validation scope followed issue #14 verbatim rather than a separate ultra-level ponytail checklist file.