# gata

## Ponytail (ultra)

All coding work in this repo uses the vendored **ponytail** skill at the **ultra** level: smallest complete change, YAGNI, and pushback on scope the ticket does not justify. Details: `docs/agents/ponytail.md`; skills live under `.cursor/skills/`; the always-on ruleset is `.cursor/rules/ponytail.mdc`.

**Unattended agents** (Cloud Agents and other async runs): do not stop for mid-run questions. Meet every acceptance criterion unless the ticket says otherwise. Under ultra, record challenged or omitted scope in a **Ponytail scope** section in the PR description or final report. Ponytail still never cuts validation at trust boundaries, error handling that prevents data loss, security, or accessibility.

## Agent skills

### Modern Web Guidance

For HTML, CSS, and client-side JavaScript, use the vendored **modern-web-guidance** skill (installed via `npx modern-web-guidance@latest install` into `.agents/skills/`; Cursor also sees `.cursor/skills/modern-web-guidance`). Search and retrieve with `npx -y modern-web-guidance@latest` before inventing UI patterns. Details: `docs/agents/modern-web-guidance.md`; licenses live next to the skill.

**Browser support (Modern Web Guidance):** Baseline **Widely available** (Safari is first-class; follow guide fallbacks when an API is not widely available).

**Telemetry:** Set `DISABLE_TELEMETRY=1` whenever agents or developers run the modern-web-guidance CLI (local `.env`, CI, and Cloud Agent environments). The tool otherwise records anonymous install/retrieve/search telemetry.

**Confirmations:** Use native `<dialog>` with `showModal()` for delete/remove/handover/version-conflict confirms — not shadcn/Radix Dialog. ADR: `docs/adr/0005-native-dialog-confirmations.md`.

### Issue tracker

Issues and specs live in GitHub Issues on ChrisHorrocks/gata, managed with the gh CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels: needs-triage, needs-info, ready-for-agent, ready-for-human, and wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Docker Compose (frontend deps)

`docker-compose.yml` mounts `./frontend` over `/app` and an anonymous volume over `/app/node_modules`. After a lockfile change, `frontend/docker-entrypoint.sh` runs `npm ci` when the lockfile hash differs from `node_modules/.package-lock.sha`, then starts Vite. Restarts with an unchanged lockfile skip install.
