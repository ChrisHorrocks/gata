# 5. Native `<dialog>` for confirmations

Date: 2026-11-15. Status: accepted.

## Context

gata needs destructive or irreversible confirmations (delete trip, remove member, organiser handover, version-conflict reload). The UI stack includes shadcn/ui (Radix primitives) for most components. [Issue #48](https://github.com/ChrisHorrocks/gata/issues/48) / research on `research/modern-web-guidance` recommends the platform `<dialog>` with `showModal()` for these flows.

## Decision

Use the native HTML `<dialog>` element for all confirmation modals in v1, not shadcn/Radix `Dialog`. Implement with `showModal()`, a visible close control, `overscroll-behavior` on the dialog surface, and `closedby` only as progressive enhancement where supported. Style confirmations to match the app with Tailwind; keep Radix/shadcn for non-modal UI only.

## Consequences

Confirmation UI may look slightly different from other Radix-based overlays until shared tokens are applied. Agents should retrieve the `dialog` guide via modern-web-guidance before implementing confirms. Safari is a first-class target; follow guide fallbacks for APIs that are not Baseline Widely available (for example `scheduler.yield()` elsewhere in the app).