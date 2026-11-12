# 3. joserfc JWTs for links, opaque cookie sessions

Date: 2026-11-12. Status: accepted.

## Context
Sign-in uses email magic links and invites. The original constraint was Authlib for JWTs, but `authlib.jose` is deprecated in favour of `joserfc`, which comes from the same authors. See the research on #4.

## Decision
Magic-link tokens (15 minutes) and invite tokens (7 days) are ES256 JWTs signed with `joserfc`. Each one has a server-side `jti` row so it can only be used once and can be revoked. Sessions are not JWTs. They are opaque rows in Postgres, sent in a `__Host-` HttpOnly, Secure, SameSite=Lax cookie, with a 30-day sliding expiry and a 90-day absolute limit. The SPA and the API are served from one origin, with CSRF protection.

## Consequences
Signing out and revoking access work immediately. Every request needs a session lookup, which is fine for a small user base.
