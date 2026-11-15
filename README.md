# gata

Expedition planning for small trekking teams. This repo is a monorepo: `frontend/` (Vite + React) and `backend/` (FastAPI + Postgres).

## One-command local stack

```bash
docker compose up --build
```

| Service   | URL |
| --------- | --- |
| SPA       | http://localhost:5173 |
| API       | http://localhost:8000/docs |
| Mailpit   | http://localhost:8025 |
| Postgres  | `localhost:5432` (user/password/db: `gata`) |

The Vite dev server proxies `/api` to the API so the browser stays on a single origin. Open the SPA to see `GET /api/v1/health` read from Postgres.

Copy `.env.example` to `.env` only when overriding defaults for non-Compose runs.

## Running without Compose

**Postgres and Mailpit** must be running (or use Compose for just `postgres` and `mailpit`).

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
export DATABASE_URL=postgresql+psycopg://gata:gata@localhost:5432/gata
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (another terminal)
cd frontend
npm install
export VITE_API_PROXY_TARGET=http://localhost:8000
npm run dev
```

## Testing conventions

Later tickets should copy these seams rather than invent new ones.

### Seam 1 — HTTP API + real Postgres

- Tests live in `backend/tests/`.
- Set `DATABASE_URL` to a real Postgres (Compose locally, GitHub Actions service container in CI).
- Drive the app with `httpx` against the FastAPI ASGI app (HTTP surface, not internal imports).
- `controllable_clock` (`app/time.py`, `controllable_clock` fixture) freezes time for expiry tests.
- `MailCapture` (`app/mail.py`, `mail_capture` fixture) stubs mail at the SMTP edge.

```bash
cd backend
export DATABASE_URL=postgresql+psycopg://gata:gata@localhost:5432/gata
pytest
```

### Seam 2 — whole screens, API stubbed at the network

- Vitest + React Testing Library in `frontend/src/**/*.test.tsx`.
- MSW intercepts `fetch` URLs (e.g. `/api/v1/health`); assert on what appears on screen.

```bash
cd frontend
npm test
```

### Lint and typecheck

```bash
cd backend && ruff check . && mypy app && pyright
cd frontend && npm run lint && npm run typecheck
```

CI runs all of the above on every pull request (`.github/workflows/ci.yml`).

## Configuration

Secrets and environment-specific values come from the environment (`backend/app/config.py`, `VITE_*` for the dev proxy). Nothing sensitive belongs in git.

## Docs

- Terms: [`GLOSSARY.md`](GLOSSARY.md)
- Decisions: [`docs/adr/`](docs/adr/)
- Agents: [`AGENTS.md`](AGENTS.md)