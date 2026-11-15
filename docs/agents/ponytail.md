# Ponytail

Coding agents in this repo use [ponytail](https://github.com/DietrichGebert/ponytail) at the **ultra** level for all implementation work. Skills are vendored from upstream commit `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846` (MIT); see `.cursor/skills/ponytail/LICENSE`.

## Layout

| Path | Purpose |
|------|---------|
| `.cursor/rules/ponytail.mdc` | Always-on ultra ruleset (required for Cursor Cloud Agents; hooks do not run there) |
| `.cursor/skills/ponytail/` | Main ponytail skill (`SKILL.md` + `LICENSE`) |
| `.cursor/skills/ponytail-*/` | Review, audit, debt, gain, and help skills |

## Default level

Ultra is enforced by the always-applied Cursor rule and `AGENTS.md`, not by local hook state.

For local Cursor sessions that use [ponytail hooks](https://github.com/DietrichGebert/ponytail/blob/master/docs/cursor-hooks.md) instead of the rule, set `PONYTAIL_DEFAULT_MODE=ultra` or `"defaultMode": "ultra"` in `~/.config/ponytail/config.json`. Do not install project hooks while `.cursor/rules/ponytail.mdc` is present; upstream treats rule and hooks as alternatives.

## Updating from upstream

Only install from `https://github.com/DietrichGebert/ponytail`, never from a fork. Replace the contents of `.cursor/skills/*` from `skills/*` in upstream, refresh `.cursor/rules/ponytail.mdc` from `.cursor/rules/ponytail.mdc` there and re-apply the ultra and unattended-agent sections documented in this file.