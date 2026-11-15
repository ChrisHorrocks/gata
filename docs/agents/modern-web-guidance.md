# Modern Web Guidance

Coding agents use Google's [Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) for HTML, CSS, and client-side JavaScript. Installed with the official CLI (not a hand-maintained fork).

## Layout

| Path | Purpose |
|------|---------|
| `.agents/skills/modern-web-guidance/` | Skill installed by `npx modern-web-guidance@latest install` (SKILL.md, offline guide index, `LICENSE`, `ATTRIBUTION.md`) |
| `.cursor/skills/modern-web-guidance` | Symlink to the path above so Cursor discovers it alongside vendored ponytail skills |

Do not copy the full guide corpus from upstream by hand; refresh with `npx modern-web-guidance@latest update` when bumping the skill.

## Baseline target

**Browser support (Modern Web Guidance):** Baseline **Widely available** — same as the skill default and aligned with Safari as a first-class browser. Follow each guide's fallbacks when an API is not widely available.

## Telemetry

The CLI may send anonymous usage data (install counts, guide IDs, search queries). **Opt out everywhere agents run the CLI** by setting `DISABLE_TELEMETRY=1` (see upstream README). gata sets this in `.env.example` for local work; Cloud Agents should inherit the variable from the environment.

## Confirmations

Destructive confirms use native `<dialog>`, not shadcn/Radix Dialog. See [ADR 0005](../adr/0005-native-dialog-confirmations.md).

## Updating

From the repo root:

```sh
DISABLE_TELEMETRY=1 npx modern-web-guidance@latest update
```

Re-copy `LICENSE` / `THIRD_PARTY_NOTICES` from the npm package if upstream changes them. Record the package version in the commit message.