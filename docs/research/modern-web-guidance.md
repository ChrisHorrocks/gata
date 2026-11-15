# Which modern-web-guidance recommendations are worth adopting in gata?

Research for [issue #49](https://github.com/ChrisHorrocks/gata/issues/49) on the [Map: modern web guidance for gata](https://github.com/ChrisHorrocks/gata/issues/48), written on 15 November 2026 (Europe/London). It triages recommendations from Google's [modern-web-guidance](https://developer.chrome.com/docs/modern-web-guidance) against gata's v1 spec and current stack.

## Recommendation

Adopt a short list of platform practices in the existing v1 build tickets, and install the official skill for future coding agents rather than vendoring a snapshot of the guides.

**Adopt now** (fold into existing tickets; do not expand v1 product scope):

- Production security headers on Caddy, in [Production Compose stack and deploy](https://github.com/ChrisHorrocks/gata/issues/32): CSP (same-origin, no `unsafe-inline` scripts), `frame-ancestors 'none'` plus `X-Frame-Options: DENY`, staged HSTS, `X-Content-Type-Options: nosniff`, a tight `Referrer-Policy`, a restrictive `Permissions-Policy`, and `Cross-Origin-Opener-Policy: same-origin`.
- A forms baseline in every form ticket: native `<form>` and labels, correct `autocomplete` and input types, `:user-invalid` (not `:invalid`) for error styling, and accessible error announcements. That covers [Profile and emergency contacts](https://github.com/ChrisHorrocks/gata/issues/15), [Trips: create, list, settings, delete](https://github.com/ChrisHorrocks/gata/issues/16), [Invites and joining a trip](https://github.com/ChrisHorrocks/gata/issues/17), [Itinerary days (list view)](https://github.com/ChrisHorrocks/gata/issues/19), [Gear library](https://github.com/ChrisHorrocks/gata/issues/24), [Trip kit](https://github.com/ChrisHorrocks/gata/issues/25), and [Meals with carriers and daily kcal](https://github.com/ChrisHorrocks/gata/issues/26).
- Native `<dialog>` with `showModal()` for confirmations (delete trip, remove member, organiser handover, version-conflict reload), with a visible close control, `overscroll-behavior` so the page behind does not scroll, and `closedby` as progressive enhancement. That covers [Trips: create, list, settings, delete](https://github.com/ChrisHorrocks/gata/issues/16), [Members: leave, remove and hand over organiser](https://github.com/ChrisHorrocks/gata/issues/18), and the conflict UI on later write tickets.
- Treat a trip start date as a calendar date (`YYYY-MM-DD`), never as a `Date` at UTC midnight, in [Trips: create, list, settings, delete](https://github.com/ChrisHorrocks/gata/issues/16). Native `Temporal.PlainDate` is still missing from shipping Safari, so a polyfill is required if Temporal is used; ISO date-only strings are enough for v1.
- Phone and table layout: stacked or sticky-header tables, safe-area insets, and usable touch targets, in [Trip sheet (printable page)](https://github.com/ChrisHorrocks/gata/issues/28), [Read-only phone layout](https://github.com/ChrisHorrocks/gata/issues/30), and the itinerary list.
- Opt into OS text scaling (`<meta name="text-scale" content="scale">`) and set `color-scheme` / `theme-color` in `frontend/index.html` (cheap; natural home is the phone-layout ticket or production HTML).
- A copy control for grid references in [Typed camp positions: grid references and lat/long](https://github.com/ChrisHorrocks/gata/issues/22).
- Yield the main thread (with a `setTimeout` fallback, because `scheduler.yield()` is unsupported in Safari) while generating contours, in [Terrain layers: hill shading and Explorer-style contours](https://github.com/ChrisHorrocks/gata/issues/23).
- Render user notes and names as text (React's default), never `dangerouslySetInnerHTML` / `innerHTML`.
- Honour `prefers-reduced-motion` whenever animation is added.

**Adopt later:** dark mode, view transitions, passkeys, a PWA / offline mode (already later in the spec), full Trusted Types enforcement once CSP is in, branded `appearance: base-select` menus, and dropping a Temporal polyfill once Safari ships the API.

**Skip for gata v1:** built-in on-device AI, WebMCP, WebAssembly, payment and SMS-OTP forms, the experimental email-verification origin trial (v1 already uses magic links), passkey "quick sign-in", geolocation, camera, web components (the app is React and shadcn/ui), live-collaboration APIs, GPX import, non-Gregorian calendars, carousels / masonry / scrollytelling, and MapLibre-replaced concerns such as 2D panning.

The official CLI's `legacy-scan` of the current frontend reported **0 findings**. That is expected: the app is still small, and the scanner covers only about a fifth of the guides. Re-run it after the form-heavy tickets.

Two product-adjacent decisions are left for Chris and are recorded on the map as not yet specified: whether to install the skill (recommended: yes, via the official installer, not a vendored snapshot), and whether confirmations should use native `<dialog>` or stay with shadcn/Radix.

## Method

Claims about what the project recommends come from primary sources:

- The source repository [GoogleChrome/modern-web-guidance-src](https://github.com/GoogleChrome/modern-web-guidance-src) (`main`, cloned 15 November 2026, Europe/London). That repo held 252 `guide.md` files. I read the README, license statement, contributing/architecture notes, and the guides listed in the triage below.
- The official documentation at [developer.chrome.com/docs/modern-web-guidance](https://developer.chrome.com/docs/modern-web-guidance), including [Get started](https://developer.chrome.com/docs/modern-web-guidance/get-started) and the [modernization workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow).
- The published npm package [`modern-web-guidance@1.0.0`](https://www.npmjs.com/package/modern-web-guidance) (published 10 November 2026, 03:29 Europe/London). I used its CLI to `retrieve` compiled guides (macros such as `FEATURE_FALLBACKS` expanded with Baseline status) and to run `legacy-scan` on `/workspace/gata/frontend`.

Browser-support and API claims were checked against the docs that own them: MDN, web.dev, and Can I Use, as cited on each item. I did not rely on third-party blog write-ups.

Fit-to-gata claims come from the [gata v1 spec](https://github.com/ChrisHorrocks/gata/issues/11), `AGENTS.md`, the ADRs under `docs/adr/`, and the code on `origin/master` as of merge commit `f1ab23f` (Safari cookie policy, after PRs #41–#45). Out-of-scope product rules from the spec were treated as binding: no live collaboration, metric only, and no GPX import in v1.

Guides with empty or unfinished bodies in the source repo (for example `preference-aware-ui`, `client-side-routing`, several form-control stubs) are not recommended; the published CLI also failed to retrieve some of those IDs.

## What this project is, and whether to vendor it

[Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) is a set of coding-agent skills, stewarded by the Chrome, Edge, Firefox, and MDN teams, that retrieve short, Baseline-aware guides at task time. The [source README](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/README.md) is explicit that coding agents default to legacy JavaScript patterns, and that the skill exists to point them at native platform APIs plus fallbacks. The installable skill itself is small (the README says about 205 tokens). It tells the agent to run `npx modern-web-guidance@latest search` / `retrieve`, rather than pasting all 250-odd guides into the repo.

There is a two-repo split: [modern-web-guidance-src](https://github.com/GoogleChrome/modern-web-guidance-src) is where issues and PRs go; [modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance) is the read-only distribution repo. Releases are weekly.

### Licenses

The source README states, "Unless otherwise noted":

- Software (the CLI and skill wrapper) is [Apache License 2.0](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/LICENSE).
- Documentation and guide content under `guides/` is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Portions of the documentation are derived from MDN Web Docs, and from W3C, WHATWG, and IETF specifications.

The source tree has no `NOTICE` file. The published npm package includes `THIRD_PARTY_NOTICES` for CLI dependencies. Apache 2.0 allows use, modification, and redistribution if the license and copyright notices are retained. CC BY 4.0 additionally requires attribution if guide text is copied into the repo. Vendoring the skill together with compiled guides would therefore need both licenses, plus attribution for the guide text, kept in the tree.

### Why not vendor it like ponytail

Ponytail is a small, stable in-repo skill. Modern Web Guidance is the opposite: its value is that the content is refreshed, and the official docs say they use `npx` "to ensure the content doesn't go stale" ([source README](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/README.md); [Get started](https://developer.chrome.com/docs/modern-web-guidance/get-started) recommends the CLI because it enables automatic updates). A snapshot under `.cursor/skills/`, in the ponytail style, would go stale and would also take on the CC BY attribution duty for a large guide corpus.

The worthwhile approach, if Chris agrees, is to install the skill with the official installer (`npx modern-web-guidance@latest install`) so agents search and retrieve at task time. Optionally record a Baseline target in `AGENTS.md`. The default, if none is set, is **Baseline Widely available** ([Get started](https://developer.chrome.com/docs/modern-web-guidance/get-started)). That default is the right starting point for gata: Chris develops in Safari, and several attractive APIs in this corpus are still Limited or missing in Safari (Temporal, `scheduler.yield()`, `closedby`). Newly available features can still be used with the fallbacks the guides already specify. I would not enable volatile-feature or origin-trial guides for v1.

The CLI collects anonymous telemetry (install counts, the calling agent name, retrieved guide IDs, and search queries; not raw user prompts). It can be turned off with `DISABLE_TELEMETRY=1`, as documented in the source README, and data is handled under the [Google Privacy Policy](https://policies.google.com/privacy). That opt-out is a decision for Chris if the skill is installed.

The Chrome extensions skill pack is irrelevant to gata.

## Already aligned (do not re-ticket)

These recommendations are already met, or already decided, on `master` or in the spec:

- **Secure cookies.** Sessions use a `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/` on HTTPS, with ordinary names only for plain HTTP on localhost ([ADR 3](https://github.com/ChrisHorrocks/gata/blob/master/docs/adr/0003-tokens-and-sessions.md), PR #45). That matches the security guide's cookie advice ([MDN: Cookie prefixes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#cookie_prefixes)).
- **CSRF.** Fetch Metadata plus a signed, session-bound double-submit token is already in place from [CSRF protection and magic-link rate limiting](https://github.com/ChrisHorrocks/gata/issues/14). The security guide lists Fetch Metadata as a Phase 3 control; gata does not need a second mechanism.
- **Same origin.** The SPA, API, and tiles are served from one origin in production (Caddy), with a Vite proxy locally. That is what the auth research and ADR 3 already required.
- **HTTPS in production.** Caddy terminates TLS automatically; this is already in [Production Compose stack and deploy](https://github.com/ChrisHorrocks/gata/issues/32). The missing piece is the companion headers, not TLS itself.
- **Sign-in field basics.** The current sign-in screen already uses `<form>`, `type="email"`, `required`, `autoComplete="email"`, and a labelled input, and reports success and failure with `role="status"` / `role="alert"`.
- **Colour tokens.** `frontend/src/index.css` already uses `oklch` custom properties and `system-ui`, which is in line with the typography and colour guidance.
- **Self-hosted tiles.** Assets are first-party, so Cross-Origin Storage, CDN Subresource Integrity, and third-party cookie partitioning do not apply.

## Adopt now

Each item names the guidance, the platform fact it rests on, why it fits gata, and which open build ticket should carry it. This research does not edit those tickets.

### 1. Production security headers — ticket #32

The [security](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/security/security/guide.md) discipline guide treats a greenfield app as the case that should "ship Phase 1 hygiene and Phase 3 enforced policies by default." Companion headers should be on from the start; CSP can be strict because gata is same-origin, has no third-party scripts, and has no OAuth pop-ups.

Recommended Caddy headers for production:

| Header | Suggested value | Why |
| --- | --- | --- |
| `Content-Security-Policy` | `default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'` plus script and style policies that do not use `'unsafe-inline'` for scripts | XSS defence in depth. Vite's production build emits same-origin module scripts, so `'self'` should be enough. Confirm at deploy time whether any inline style from the map or print sheet needs a narrow exception. Official reference: [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy). |
| `X-Frame-Options` | `DENY` | Complements `frame-ancestors 'none'`. gata is not embedded. [MDN: X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options). |
| `Strict-Transport-Security` | start with a short `max-age` (the guide suggests 300 seconds) and raise it toward `max-age=31536000; includeSubDomains; preload` once HTTPS is known-good | A long `max-age` on a misconfigured host can lock people out until the cache expires. Note the staging steps on [AWS manual setup runbook and checklist](https://github.com/ChrisHorrocks/gata/issues/33) as well. [MDN: Strict-Transport-Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security). |
| `X-Content-Type-Options` | `nosniff` | Stops MIME sniffing. [MDN: X-Content-Type-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options). |
| `Referrer-Policy` | `strict-origin-when-cross-origin` or `no-referrer` | Magic-link query tokens must not leak via `Referer`. [MDN: Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy). |
| `Permissions-Policy` | disable unused powerful features (`camera`, `microphone`, `geolocation`, `payment`, and similar) | v1 uses none of them. [MDN: Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy). |
| `Cross-Origin-Opener-Policy` | `same-origin` | No payment or OAuth pop-ups in v1. [MDN: COOP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy). |

Do **not** enforce `require-trusted-types-for 'script'` in the first production CSP. The Trusted Types guide itself says to audit framework sinks first; a React 19 SPA can break if enforcement is flipped on blindly. Report-only Trusted Types can wait until after #32. Cross-Origin Isolation (`COEP` / full CORP) is unnecessary: gata does not need `SharedArrayBuffer`.

There are currently no security headers in the repo (the local tiles Caddyfile only sets CORS and `Accept-Ranges`).

### 2. Forms baseline — tickets #15, #16, #17, #19, #24, #25, #26

The [forms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/forms/forms/guide.md) discipline guide, plus [validate-input-after-interaction](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/forms/validate-input-after-interaction/guide.md), [required-field-feedback](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/forms/required-field-feedback/guide.md), [accessible-error-announcement](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/accessibility/accessible-error-announcement/guide.md), and [autofill-sign-in-form](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/forms/autofill-sign-in-form/guide.md), all say the same thing in slightly different words:

- Wrap fields in a real `<form>` with labelled controls.
- Use the correct input type and `autocomplete` token (`email`, `name`, `tel`, and so on). Emergency-contact phones and display names in #15 are the obvious next place this matters.
- Style and announce errors with `:user-invalid`, not `:invalid`. `:invalid` matches a required empty field on first paint, which is noisy for everyone and especially for screen-reader users. `:user-invalid` is Baseline Widely available (since 2 November 2023) in Chrome 119, Edge 119, Firefox 88, and Safari 16.5. Official references: [MDN: `:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:user-invalid) and [web.dev: `:user-valid` and `:user-invalid`](https://web.dev/articles/user-valid-and-user-invalid-pseudo-classes).
- Keep the programmatic error state (for example `aria-invalid`) in step with the visual one, and associate error text with the field (`aria-describedby`).
- Prefer native constraint validation over a custom "touched" flag.

The spec has no formal WCAG target, but these are cheap, built-in behaviours, not a new accessibility programme. They should be the default in each form ticket, not a separate retrofit.

`field-sizing: content` for notes `<textarea>`s (camp notes, emergency notes) is progressive enhancement and can ride along in #15 and #21.

### 3. Native confirm dialogs — tickets #16, #18, and later write UIs

The [dialog](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/ui-components/dialog/guide.md) guide, with [light-dismiss-a-dialog](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/ui-behaviors/light-dismiss-a-dialog/guide.md), [platform-controls-dismiss-dialog](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/ui-behaviors/platform-controls-dismiss-dialog/guide.md), [prevent-page-scroll-under-modal-dialog](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/ui-behaviors/prevent-page-scroll-under-modal-dialog/guide.md), and [declarative-dialog-popover-control](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/ui-behaviors/declarative-dialog-popover-control/guide.md), recommends the native `<dialog>` element opened with `showModal()`:

- The browser provides the top layer, focus trapping, and Escape-to-close. Do not add a hand-rolled `role="dialog"`, `aria-modal`, or focus trap on a native modal.
- Always include a visible close control.
- Set `overscroll-behavior: contain` on `dialog:modal` and make `dialog::backdrop` a scroll container, rather than setting `overflow: hidden` on `body` (which makes the scrollbar disappear and shifts the layout). See [MDN: `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) and [MDN: `overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior).
- `closedby="any"` enables light-dismiss; `closedby="none"` plus a `cancel` handler is for destructive or dirty-state confirms (delete trip). `closedby` is still Limited availability; without it, Escape and the close button still work, and a small click-outside fallback is specified if light-dismiss is required. Official element reference: [MDN: `<dialog>` `closedby`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#closedby).

gata needs confirms for deleting a trip, removing a member, handing over the organiser role, and the "someone else saved first, reload?" warning. Native `<dialog>` is a better default than a new Radix dependency for those.

This is also the one adopt-now item that can conflict with the existing shadcn/ui (Radix) component set. Buttons and cards can stay as they are. The open question is only whether confirmations should be native `<dialog>` or a shadcn Dialog for visual consistency. The recommendation is native; Chris should confirm.

### 4. Date-only trip dates — ticket #16

The [capture-location-agnostic-data](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/js/capture-location-agnostic-data/guide.md) guide is aimed exactly at values like a trip start date: a calendar date that must be the same in every time zone. It shows how constructing `new Date("1990-01-01")` or `` `${date}T00:00:00Z` `` makes a date west of UTC display as the previous day.

Official API: [MDN: `Temporal.PlainDate`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate). Temporal is Limited availability: Chrome 144 and Edge 144 (January 2026) and Firefox 139 (May 2025). As of this research, Can I Use still shows shipping Safari 27.2 without `PlainDate`; only Safari 27.3 / Technology Preview is listed as supporting it ([Can I Use: Temporal.PlainDate](https://caniuse.com/mdn-javascript_builtins_temporal_plaindate)). Chris uses Safari, so v1 must not take a native-only Temporal dependency.

Adopt now, without waiting for Safari:

- Store and exchange trip start dates as ISO calendar strings (`YYYY-MM-DD`), and use `<input type="date">`.
- Never convert those strings through a UTC midnight `Date` for display or arithmetic.
- A `temporal-polyfill` (the compiled guide's fallback, ~15 KB min+gz, loaded only when `Temporal` is missing) is optional, not required, for v1.

Session expiry and token timestamps are instants, not calendar dates. Those should stay as timezone-aware datetimes, which the backend already does in `app/time.py`.

### 5. Phone layout, tables, and safe areas — tickets #28, #29, #30, #19

[form-factor-adaptation](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/user-experience/form-factor-adaptation/guide.md) and [responsive-table](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/ui-atoms/responsive-table/guide.md) cover the v1 "desktop first, usable read-only on phones" decision:

- Size hit targets for touch where the phone layout is used.
- Keep content clear of notches and home indicators with `env(safe-area-inset-*)` ([MDN: `env()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env) / [safe area insets](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env#safe-area-inset_values)).
- Let components react to their container, not only the viewport (container queries, already Baseline).
- For the itinerary and trip sheet, use a real `<table>` with sticky headers on wide screens and a stacked layout on narrow ones, rather than a div grid that becomes unreadable.

The guidance corpus has no dedicated print-CSS guide. Print behaviour for the trip sheet and the overview map stays with #28 and #29 as already specified; nothing here replaces those tickets.

### 6. OS text scale and browser chrome theming — `index.html`, ticket #30 or #32

[respect-os-text-scale](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/accessibility/respect-os-text-scale/guide.md) recommends `<meta name="text-scale" content="scale">` so supporting mobile browsers honour the OS text size, together with `rem`/`em` (not `px`, and not viewport-only type). `frontend/index.html` already has a proper viewport tag and no root font-size lock; this is a one-line addition and a reminder to keep typography relative as screens are built. Treat it as progressive enhancement.

[browser-ui-theming](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/visual-design/browser-ui-theming/guide.md) recommends `color-scheme` (Baseline Widely available since February 2022) so form controls and scrollbars follow a declared scheme, and a `theme-color` for the browser UI. That can be light-only in v1; it does not require a dark theme. [MDN: `color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme).

### 7. Copy grid references — ticket #22

[copy-button](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/ui-components/copy-button/guide.md) is a small, well-specified control: `type="button"`, an accessible name, `navigator.clipboard.writeText` with a visible success/failure message in a `role="status"` live region outside the button, and a short timeout to clear it. Official API: [MDN: `clipboard.writeText()`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText). This is a natural addition next to a typed grid reference or lat/long on the camp form.

### 8. Yield during contour generation — ticket #23

Contour lines are generated in the browser from a Terrarium tileset with `maplibre-contour`. That is the one obvious long-task risk in v1. [break-up-long-tasks](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/performance/break-up-long-tasks/guide.md) says to yield at least every 50 ms with `scheduler.yield()`, and **requires** a fallback: the Scheduler API is Limited availability and **unsupported in Safari**. The specified fallback is `await new Promise((resolve) => setTimeout(resolve, 0))` after a feature check. Official API: [MDN: `scheduler.yield()`](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield).

If the library already keeps work off the main thread, this shrinks to a check rather than a rewrite. If it does not, #23 should yield.

### 9. User-supplied text is text — any ticket that shows names or notes

The [sanitize-untrusted-html](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/security/sanitize-untrusted-html/guide.md) guide exists for when a product must render user HTML. gata's notes and names are plain text in the spec. The matching rule is the security guide's Phase 1 advice: use `textContent` (or React text children), never `innerHTML` / `dangerouslySetInnerHTML`. That is sufficient. Do not add the Sanitizer API or DOMPurify unless a later ticket introduces rich text. The Sanitizer API is itself Limited availability ([MDN: Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/Sanitizer)).

### 10. Reduced motion — any ticket that adds animation

The [motion](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/ui-behaviors/motion/guide.md) guide requires honouring `prefers-reduced-motion`: either wrap decorative animation in `@media (prefers-reduced-motion: no-preference)`, or provide a reduced alternative under `reduce`, and always leave the element in its final state. Official reference: [MDN: `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion). This applies to dialog open/close, list reordering, and any map animation, not only a future "motion design" ticket.

## Adopt later

These are real recommendations, but they are out of v1 scope, depend on something that has not shipped yet, or are polish.

- **Dark mode** ([dark-mode](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/visual-design/dark-mode/guide.md), `light-dark()`, `prefers-color-scheme`). The tokens are already `oklch`, so this should be straightforward later. It is not in the v1 spec.
- **View transitions** ([same-document-transitions](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/ui-behaviors/same-document-transitions/guide.md) and related). Nice for SPA navigations; not needed to ship planning screens.
- **Passkeys** (the whole `security/passkey-*` family, plus `quick-sign-ins`). v1 sign-in is email magic links. Passkeys can be offered later as an additional method; they should not replace the magic-link tickets.
- **PWA, installability, offline, background sync** (`pwa/*`). The spec already parks offline use on the trail for a later version, with the printed sheet and GPX export as the v1 stand-in.
- **Trusted Types enforcement** (`require-trusted-types-for 'script'`). Worth doing after CSP lands and after a sink audit of React 19 and MapLibre. Not a first-deploy requirement.
- **Customizable `<select>`** (`appearance: base-select`) and CSS anchor positioning for menus. Native selects are enough for v1 carrier pickers. Anchor positioning is still Limited (the compiled 1.0.0 guide listed it as Safari-only at the time of publication).
- **Native Temporal without a polyfill**, once shipping Safari has `PlainDate`.
- **`Clear-Site-Data` on sign-out**, once production headers exist.
- **CSP reporting endpoints** (`Reporting-Endpoints`, report-only policies) if and when there is somewhere useful to send reports.
- **Drag-and-drop reordering** for itinerary days, if #19 chooses drag rather than move-up / move-down buttons. The [drag-and-drop](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/ui-behaviors/drag-and-drop/guide.md) guide is the right one to retrieve at that point; it is not a reason to require drag.

## Skip

Grouped by reason. "Skip" means do not add a v1 ticket or stretch an existing one. Some of these may become relevant in a later version.

**Ruled out by the v1 spec**

- Anything aimed at live collaborative editing (for example custom-highlight "collaborative cursors").
- GPX import, in-app route drawing, and trail-offline / service-worker cache of the planner itself.
- Non-metric units, and `support-global-calendar-systems` (gata is metric only and can use the ISO calendar).
- Ingredient shopping lists, cost splitting, and the rest of the spec's later/never list.

**Wrong product shape for v1**

- Built-in on-device AI (`translator`, `summarizer`, `language-model`, `language-detection`).
- WebMCP / agentic forms.
- WebAssembly / C++ on the web.
- The Chrome extensions skill pack.
- Payment forms, SMS OTP / WebOTP, camera and microphone capture.
- [verify-email-ownership](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/guides/security/verify-email-ownership/guide.md): an experimental origin-trial API offered as an alternative to sending a magic link or OTP. v1 has already decided on emailed magic links, and the official docs keep origin-trial guides off unless you opt in.
- Geolocation (`user-location`). Camps are placed on a map or typed; v1 does not need the user's live position.
- Web components, Shadow DOM, and form-associated custom elements. The frontend is React with copied shadcn/ui components.
- Cross-origin storage, shared-font COS, and other multi-site cache APIs. Tiles, fonts, and sprites are first-party.
- Local network access, partitioned third-party cookies, FedCM, and password credentials.
- Analytics beacons, `fetchLater`, A/B testing snippets, and session-time metrics. There is no analytics requirement in v1.
- 2D CSS panning. The map is MapLibre, which already handles pan and zoom.
- Carousels, masonry / grid lanes, scrollytelling, pull-to-reveal, swipe-to-remove, media players, ratings, and similar unrelated UI atoms.

## Appendix: scan result and corpus

- Compiled CLI: `modern-web-guidance@1.0.0`. Command: `npx modern-web-guidance@latest legacy-scan frontend`. Result: "0 findings from 33 qualified guides." The CLI notes that this is about 20% of the corpus; the rest is retrieved by search when a UI task starts.
- Source corpus on 15 November 2026: 252 guide files under `guides/`, including discipline hubs and some unfinished stubs.
- Official eval snapshot in the source README (8 November 2026) reports large guided-vs-unguided uplifts on their own harness. That is evidence the skill helps agents, not evidence that every guide belongs in gata.

### Primary sources

- [Modern Web Guidance docs](https://developer.chrome.com/docs/modern-web-guidance), [Get started](https://developer.chrome.com/docs/modern-web-guidance/get-started), [modernization workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow)
- [Source repository](https://github.com/GoogleChrome/modern-web-guidance-src) and its [README license section](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/README.md)
- [Apache 2.0 license](https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/LICENSE) and [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- [npm: modern-web-guidance@1.0.0](https://www.npmjs.com/package/modern-web-guidance)
- [MDN: `:user-invalid`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:user-invalid), [web.dev: `:user-valid` and `:user-invalid`](https://web.dev/articles/user-valid-and-user-invalid-pseudo-classes)
- [MDN: `Temporal.PlainDate`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate), [Can I Use: Temporal.PlainDate](https://caniuse.com/mdn-javascript_builtins_temporal_plaindate)
- [MDN: `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy), [Strict-Transport-Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security), [Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy), [Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy), [COOP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy), [X-Content-Type-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options), [X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)
- [MDN: `scheduler.yield()`](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield), [MDN: `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion), [MDN: `clipboard.writeText()`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText), [MDN: `color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme)
- [gata v1 spec](https://github.com/ChrisHorrocks/gata/issues/11)
