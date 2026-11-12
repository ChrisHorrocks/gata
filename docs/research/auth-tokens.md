# How should Authlib issue and check magic-link, invite, and session tokens?

## Recommendation

Use Authlib's current JOSE library, [`joserfc`](https://jose.authlib.org/en/guide/jwt/), not the deprecated `authlib.jose` module, to issue and verify short-lived, explicitly typed JWTs for **magic-link** and **invite** tokens. Sign them with **ES256** (P-256) from a `KeySet`, allow only that algorithm at verify time, and keep a server-side Postgres row keyed by `jti` so each token can be consumed once and revoked.

Do **not** use a JWT for the session after sign-in. A JWT is a poor fit here: logout, idle timeout, and "sign out everywhere" all need a server-side record, which removes the usual reason to use a stateless JWT. Store an **opaque server-side session** in Postgres and send only a random session identifier in a `__Host-` `HttpOnly; Secure; SameSite=Lax` cookie. Read that cookie with FastAPI's `APIKeyCookie`. Protect state-changing requests against CSRF (Fetch Metadata plus a signed, session-bound double-submit cookie is a practical v1 pairing). Serve the Vite SPA and the API on the **same origin** in production so the cookie is first-party.

That still honours the project constraint to use Authlib for JWT handling *where appropriate*: magic links and invites travel in email URLs and benefit from a signed, typed JWT; the session does not.

## Question

How should the FastAPI backend use Authlib (its JOSE/JWT support) to issue and verify three token kinds: single-use magic-link sign-in tokens, trip invite tokens, and session tokens after sign-in? Cover signing algorithm and key handling, expiry, single-use enforcement and revocation (what must be stored server-side), where the session token lives in the browser (cookie vs header) given a Vite SPA, and CSRF implications.

## Use `joserfc`, not `authlib.jose`

Authlib 1.7 deprecated `authlib.jose` in favour of [`joserfc`](https://jose.authlib.org/en/migrations/authlib/), which is derived from Authlib and is the library Authlib itself now depends on. Current Authlib docs state that the module was deprecated in 1.7 and **will be removed in Authlib 2.0** ([JOSE docs, latest](https://docs.authlib.org/en/latest/jose/); [joserfc migration guide](https://docs.authlib.org/en/latest/upgrades/jose.html)). As of Authlib 1.9.5 (5 November 2026, Europe/London), the published package requires `joserfc>=1.6.8` ([PyPI: Authlib](https://pypi.org/project/Authlib/)).

The APIs are similar (`jwt.encode(header, claims, key)` / `jwt.decode(...)`) but not drop-in:

- Keys must be typed (`ECKey`, `OctKey`, `KeySet`, and so on), not raw strings or PEM bytes. Authlib's migration notes say this is intentional, for security ([joserfc migration](https://docs.authlib.org/en/latest/upgrades/jose.html); [Migrating from Authlib](https://jose.authlib.org/en/migrations/authlib/)).
- In `joserfc`, `jwt.decode` only verifies the signature and parses claims. Expiry and other claim checks are a second step, via `JWTClaimsRegistry.validate(...)` ([JWT guide](https://jose.authlib.org/en/guide/jwt/); [migration: jwt.decode](https://jose.authlib.org/en/migrations/authlib/)).
- By default, encode/decode accept only [recommended algorithms](https://jose.authlib.org/en/guide/algorithms/). Pass `algorithms=["ES256"]` anyway, so the allowed set is an application decision rather than a library default ([JWT guide: Algorithms & Registry](https://jose.authlib.org/en/guide/jwt/); [RFC 8725 §3.1](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1)).

Authlib's FastAPI integration is an **OAuth 2 client** (redirect to Google and similar), not a first-party token issuer ([Authlib FastAPI client](https://docs.authlib.org/en/latest/oauth2/client/web/fastapi.html)). It is not the right tool for gata's magic-link or session flow. FastAPI's own JWT tutorial uses PyJWT plus `OAuth2PasswordBearer` and an `Authorization: Bearer` header, in a password-based demo ([OAuth2 with JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)). That tutorial is not a mandate for this project: gata has no passwords, and a same-site SPA is a different threat model.

Depend on `joserfc` (and Authlib itself only if a later feature needs its OAuth client or server). Call `joserfc.jwt` for every JWT the API issues.

## Signing algorithm and keys

### Algorithm

Use **ES256** (ECDSA on P-256) for magic-link and invite JWTs.

- `joserfc` lists ES256 as a recommended JWS algorithm and `HS256` as recommended too; `none` is deprecated, and the old `EdDSA` identifier has been replaced by `Ed25519` / `Ed448` ([Algorithms](https://jose.authlib.org/en/guide/algorithms/)).
- OWASP recommends ECDSA (`ES256`) and HMAC-SHA-2 (`HS256`) among current options, and marks RSASSA-PKCS1-v1_5 (`RS256`) as not recommended ([JWT cheat sheet: Public-key Signatures vs MAC](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)).
- HMAC (`HS256`) is acceptable when the issuer is also the sole audience, which is true for gata ([same source](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)). ES256 is still the better default: verification uses a public key, rotation is a matter of publishing a new key in a `KeySet`, and it avoids the long-standing "treat an RSA/EC public key as an HMAC secret" confusion class ([RFC 8725 §2.1](https://www.rfc-editor.org/rfc/rfc8725.html#section-2.1); [OWASP: Key type confusion](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)). Authlib 1.9.x still had to harden `authlib.jose` against that class of bug ([GHSA-f7j6-p4qx-gq99](https://github.com/authlib/authlib/security/advisories/GHSA-f7j6-p4qx-gq99)). `joserfc` typed keys and a single allow-listed algorithm close the same door.

Do not encrypt these tokens (JWE). A signed JWT is not confidential — anyone who sees the URL can read the claims — but the claims (email, trip id, expiry) are not secrets that need to travel with the token ([OWASP: Signed JWTs are not confidential](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)). TLS covers the email click and the API hop. Keep sensitive data on the server.

### Key handling and rotation

- Generate a P-256 `ECKey` with `ECKey.generate_key("P-256")`, call `ensure_kid()` so every key has a `kid`, and keep the private JWK in a secret (environment or a mounted file), not in the repo ([JWK guide](https://jose.authlib.org/en/guide/jwk/)).
- Load signing keys as a `KeySet`. When encoding, set `"alg": "ES256"` and `"kid"` in the header so `jwt.encode` / `jwt.decode` select the right key ([JWT guide: Use key set](https://jose.authlib.org/en/guide/jwt/)).
- Rotate by adding a new key to the set, signing new tokens with it, and keeping the previous public key in the set until every outstanding magic-link and invite JWT has expired. Then drop the old key. `jwt.decode` will resolve the `kid` from the set.
- Bind each key to one algorithm (set `alg` / `use` on the JWK) and pass `algorithms=["ES256"]` on both encode and decode ([RFC 8725 §3.1](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1); [joserfc JWK options](https://jose.authlib.org/en/guide/jwk/)).
- Never take the verification key from the token header (`jwk`, `jku`, `x5u`, `x5c`). Use only keys the server already trusts ([RFC 8725 §3.10](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.10); [OWASP: Trusting key material in the header](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)).
- Treat `kid` as untrusted lookup input: validate it before using it in a query ([RFC 8725 §3.10](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.10)).

### Claims and typing, for both JWT kinds

Every issued JWT should include:

| Field | Role |
| --- | --- |
| `typ` header | Explicit type: `gata-magic+jwt` or `gata-invite+jwt`. Reject a missing or unexpected `typ` at the consume endpoint ([RFC 8725 §3.11](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.11)). |
| `iss` | A configured issuer, e.g. `https://gata.example` (the deployment's canonical origin). |
| `aud` | A distinct audience per kind, e.g. `gata.magic` and `gata.invite`, so a magic link cannot be presented as an invite ([RFC 8725 §3.9 and §3.12](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.12)). |
| `sub` | The intended email address, as a string. |
| `jti` | A new UUID for this token. Used as the server-side row key and as the replay identifier ([RFC 7519 §4.1.7](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.7)). |
| `iat`, `exp` | Issued-at and expiry. `joserfc` converts `datetime` values and `JWTClaimsRegistry` validates `exp` / `nbf` / `iat` by default ([JWT guide](https://jose.authlib.org/en/guide/jwt/); [RFC 7519 §4.1.4](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.4)). |
| Invite-only | The trip id (a dedicated claim such as `trip_id`), and optionally the inviting user's id. |

Validate `iss`, `aud`, `typ`, `exp`, and `sub` on every consume, with mutually exclusive rules per kind ([RFC 8725 §3.8–3.12](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.8)). Do not rely on a denylist of raw token strings or hashes of the compact JWT: JWT encoding and some signatures are malleable, so the stable identifier is `jti` ([OWASP: JWT denylist](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)).

## Per token kind

### Magic-link sign-in — JWT, appropriate

A magic link has to travel in an email URL, identify one inbox, expire quickly, and be unforgeable. A signed, short-lived JWT with a server-side `jti` row is a good fit. OWASP notes that a JWT may replace a random URL token, but it does not remove the need to store, expire, and invalidate the token ([Forgot Password cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)).

- **Expiry:** 15 minutes. Short enough that a leaked mailbox or log line has a small window; long enough for a slow mail path.
- **Single-use:** Insert a `link_tokens` row with `jti`, kind `magic`, email, `expires_at`, and `consumed_at` null when the link is issued. On consume, after the signature and claims succeed, atomically mark the row consumed (`UPDATE ... SET consumed_at = now() WHERE jti = ? AND consumed_at IS NULL AND expires_at > now()`, requiring one row updated). A second click fails.
- **Revocation:** Issuing a new magic link for the same email should mark any earlier unused magic-link rows for that email as consumed (or deleted). There is nothing else to revoke once `exp` has passed; rows past `expires_at` can be purged.
- **Request hygiene:** Return the same response, in a consistent time, whether or not the email has an account; rate-limit per email and per IP; do not lock the account after repeated requests ([Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)). Build the link from a configured public origin, never from the request `Host` header. Serve the consume page with `Referrer-Policy: no-referrer` so the token is not leaked in a later `Referer` ([same source](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)).
- **Consume flow:** The email link will be a GET. After a successful consume, regenerate any pre-auth session, set the authenticated session cookie, and **303 redirect** to a URL that does not contain the token. Prefer a small confirmation step (POST the token from the landing page, showing the email that will be signed in) so a GET is not the only state change and login CSRF is harder ([OWASP CSRF: login forms](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html); [Session Management: renew the session ID after privilege change](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)).

Do not put the JWT in `localStorage` or in an `Authorization` header. It is used once, in the link, and then discarded.

### Trip invite — JWT, appropriate

An invite also travels as a URL, may be opened before the recipient has an account, and must name a trip and (usually) an email. The same JWT + `jti` row pattern applies, with a longer life and an organiser-controlled revoke.

- **Expiry:** 7 days from issue, plus explicit organiser revocation.
- **Single-use:** One emailed invite is consumed when that address successfully joins the trip (after magic-link sign-in if they have no session yet). The consume transaction should create the membership only if the invite row is still unused and unexpired.
- **Revocation:** The organiser deletes or flags the row. Signature verification alone is not enough, because a still-unexpired JWT would otherwise keep working.
- **Claims:** `typ = gata-invite+jwt`, `aud = gata.invite`, `sub` = invited email, `trip_id`, `jti`, `exp`. If the signed-in user is not that email, reject the invite.
- **Shareable multi-use links** (anyone with the URL can join) are a different product choice and are out of scope for this recommendation. They would still need a stored, revocable record; a bare JWT would not be enough.

### Session after sign-in — opaque server-side session, JWT is a poor fit

OWASP is direct: a JWT is often suggested for "stateless" user sessions, but that usage is frowned upon. Invalidation needs a denylist, at which point the session is no longer stateless and a ordinary session store is the better design ([JWT cheat sheet: Not using JWTs](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html); [REST Security: JWT revocation](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)).

gata needs exactly those invalidation paths: logout, idle timeout, absolute timeout, and "sign out everywhere" (for example after a suspected mailbox compromise). FastAPI's tutorial JWT cannot be revoked before `exp` without an extra store. Putting a session JWT in `Authorization: Bearer` also forces the SPA to hold the token in JavaScript, which OWASP and NIST both reject (`localStorage` / `sessionStorage` are visible to any script in the origin) ([Session Management: Web Storage](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html); [NIST SP 800-63B-4: Session bindings](https://pages.nist.gov/800-63-4/sp800-63b/session/)).

**Recommendation:** an opaque session.

- On successful magic-link consume, create a `sessions` row: a public id, a SHA-256 hash of a CSPRNG verifier (at least 128 bits of entropy; 160 or more is better), `user_id`, `created_at`, `last_seen_at`, absolute `expires_at`, and `revoked_at` ([Session Management: Server-Side Session Token Storage](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html); [NIST: session secrets at least 64 bits, generated with an approved CSPRNG](https://pages.nist.gov/800-63-4/sp800-63b/session/)).
- Put `id` and the raw verifier in the cookie; store only the hash. Look up by id, compare hashes in constant time, and never accept the id alone.
- **Idle timeout:** 30 minutes since `last_seen_at`. **Absolute timeout:** 8 hours since `created_at`. These sit in OWASP's ranges for lower-risk apps (15–30 minutes idle) and a full-day work session (4–8 hours absolute) ([Session expiration](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)). Enforce both on the server. Provide a visible logout that revokes the row and clears the cookie; offer a way to revoke all of a user's sessions.
- Renew the session (new id and verifier) at privilege changes, including the transition from anonymous to signed-in ([same cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)).
- Log a salted hash of the session id, never the raw cookie value.

## Where the session lives in the browser, and CSRF

The production app is a Vite React SPA served alongside FastAPI through Docker Compose, so it can and should be **same-origin** (a reverse proxy serves the SPA and forwards `/api` to FastAPI). That makes a first-party cookie the right transport.

### Cookie, not `Authorization` header

Set the session cookie with FastAPI/Starlette `Response.set_cookie` ([Response Cookies](https://fastapi.tiangolo.com/advanced/response-cookies/)) using:

```
Set-Cookie: __Host-id=<id>.<verifier>; Path=/; Secure; HttpOnly; SameSite=Lax
```

- `__Host-` requires `Secure`, `Path=/`, and no `Domain` attribute, which stops subdomain cookie forging ([OWASP Session Management: Cookie Name Prefixes](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html); [NIST SP 800-63B-4: Browser Cookies](https://pages.nist.gov/800-63-4/sp800-63b/session/)).
- `HttpOnly` keeps the identifier out of `document.cookie` (XSS still can *use* the cookie, but cannot exfiltrate it as easily).
- `Secure` restricts it to HTTPS. In local Docker, serve the app on `https://localhost` or a local TLS proxy; `localhost` is a secure context for development.
- `SameSite=Lax` (not `Strict`) so a logged-in member who follows an emailed trip or invite link still sends the cookie on that top-level GET. `Strict` would look signed-out after an email click. NIST and OWASP both allow Lax or Strict; OWASP prefers Strict when the UX allows it, and treats SameSite as **defence in depth, not a CSRF substitute** ([Session Management: SameSite](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html); [CSRF: SameSite](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html); [NIST browser cookies](https://pages.nist.gov/800-63-4/sp800-63b/session/)).
- Do not set `Max-Age` / `Expires` as the source of truth; expire the row on the server. A session cookie (no `Max-Age`) is fine. Clearing the cookie on logout does not, by itself, invalidate a stolen copy ([Session Management: Expire and Max-Age](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)).

Read the cookie with `APIKeyCookie(name="__Host-id")` ([FastAPI security: APIKeyCookie](https://fastapi.tiangolo.com/reference/security/)). Do not use `OAuth2PasswordBearer`: it looks for an `Authorization` header and is built around a password token endpoint, which gata does not have ([OAuth2PasswordBearer](https://fastapi.tiangolo.com/reference/security/); [Security first steps](https://fastapi.tiangolo.com/tutorial/security/first-steps/)).

A Bearer token in a header would avoid cookie CSRF (the browser will not attach it automatically) but would have to live in JavaScript storage, which is the worse trade for this same-site SPA.

### CSRF

Because the session is a cookie, the browser will attach it to any request the user's browser makes to the origin. FastAPI has no built-in CSRF scheme. For v1:

1. Never use GET (or other safe methods) to change server state, except the tightly constrained magic-link / invite landing described above ([CSRF cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)).
2. On state-changing requests, reject `Sec-Fetch-Site: cross-site`. Allow `same-origin` (and top-level safe navigations). If the header is missing, fall back to checking `Origin` (or `Referer`) against the configured origin ([Fetch Metadata](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html); [NIST: POST/PUT SHALL contain a session identifier the RP verifies against CSRF](https://pages.nist.gov/800-63-4/sp800-63b/session/)).
3. Also issue a **signed, session-bound double-submit CSRF cookie** (readable by JS, not `HttpOnly`) and require its value on a custom header such as `X-CSRF-Token`. Bind the HMAC to the server-side session id, not to a static user id ([Signed Double-Submit Cookie](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)). SameSite plus Fetch Metadata plus this token is the defence-in-depth set OWASP describes.

The SPA should send `credentials: 'include'` on API fetches and must not drive state-changing URLs from attacker-controlled inputs (client-side CSRF) ([same cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)).

### Development vs production origin

In production, put the SPA and API behind one origin so the `__Host-` cookie is first-party and CORS is unnecessary.

Vite's default dev server is a **different origin** (for example `http://localhost:5173` talking to `http://localhost:8000`). A `__Host-` cookie set by the API will not be sent to that dev server, and a cross-origin `fetch` with credentials needs a tight `Access-Control-Allow-Origin` (never `*`) plus `Allow-Credentials`. The least awkward v1 approach is to **proxy `/api` through the Vite dev server** so the browser still sees one origin during development.

## What must be stored server-side

| Kind | Store | Why a signature is not enough |
| --- | --- | --- |
| Magic-link JWT | `link_tokens` row: `jti`, kind, email, `expires_at`, `consumed_at` | Single-use and "replace previous unused link" |
| Invite JWT | Same table (or a sibling): plus `trip_id`, inviter, `revoked_at` | Single-use and organiser revoke before `exp` |
| Session | `sessions` row: id, verifier hash, user, timestamps, `revoked_at` | Logout, idle/absolute timeout, sign out everywhere |
| Signing keys | Secret config: private JWK / `KeySet` | Not in Postgres if it can be avoided; never in git |
| CSRF | HMAC key plus the session id already stored | Signed double-submit; no extra table required |

The compact JWT itself is not stored. Do not store the raw session verifier, only its hash.

## Follow-ups that may deserve their own tickets

- **Dev-origin / Vite proxy:** make cookie auth work in local Docker Compose and `vite dev` without relaxing `__Host-` / `Secure` in production.
- **CSRF implementation detail:** Fetch Metadata middleware plus signed double-submit, and how the React client attaches `X-CSRF-Token`.
- **Magic-link confirmation UX:** GET landing page vs immediate consume, and login-CSRF / "you are signing in as …" copy.
- **Shareable multi-use trip links,** if product wants them later; they need a different stored invite model.
- Do not start from `authlib.jose`; any code sample that imports it will warn today and break on Authlib 2.0.

## Sources

- [Authlib JOSE (latest): `authlib.jose` deprecated in 1.7, removed in 2.0](https://docs.authlib.org/en/latest/jose/)
- [Authlib joserfc migration](https://docs.authlib.org/en/latest/upgrades/jose.html)
- [joserfc: Migrating from Authlib](https://jose.authlib.org/en/migrations/authlib/)
- [joserfc: JSON Web Token](https://jose.authlib.org/en/guide/jwt/)
- [joserfc: Algorithms](https://jose.authlib.org/en/guide/algorithms/)
- [joserfc: JSON Web Key](https://jose.authlib.org/en/guide/jwk/)
- [PyPI: Authlib 1.9.5](https://pypi.org/project/Authlib/)
- [Authlib FastAPI OAuth client](https://docs.authlib.org/en/latest/oauth2/client/web/fastapi.html)
- [GHSA-f7j6-p4qx-gq99](https://github.com/authlib/authlib/security/advisories/GHSA-f7j6-p4qx-gq99)
- [FastAPI: OAuth2 with password and JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [FastAPI: Response Cookies](https://fastapi.tiangolo.com/advanced/response-cookies/)
- [FastAPI: Security tools (`APIKeyCookie`, `OAuth2PasswordBearer`)](https://fastapi.tiangolo.com/reference/security/)
- [FastAPI: Security first steps](https://fastapi.tiangolo.com/tutorial/security/first-steps/)
- [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 8725: JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html)
- [NIST SP 800-63B-4: Session Management](https://pages.nist.gov/800-63-4/sp800-63b/session/)
