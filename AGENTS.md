# gata

## Ponytail (ultra)

All coding work in this repo uses the vendored **ponytail** skill at the **ultra** level: smallest complete change, YAGNI, and pushback on scope the ticket does not justify. Details: `docs/agents/ponytail.md`; skills live under `.cursor/skills/`; the always-on ruleset is `.cursor/rules/ponytail.mdc`.

**Unattended agents** (Cloud Agents and other async runs): do not stop for mid-run questions. Meet every acceptance criterion unless the ticket says otherwise. Under ultra, record challenged or omitted scope in a **Ponytail scope** section in the PR description or final report. Ponytail still never cuts validation at trust boundaries, error handling that prevents data loss, security, or accessibility.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues on ChrisHorrocks/gata, managed with the gh CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels: needs-triage, needs-info, ready-for-agent, ready-for-human, and wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
