# Regression suite

A small, durable Playwright suite covering the behaviors most likely to regress silently
after future changes — not a full-app audit (see `tests/workbench.spec.js` and
`tests/audit-integrity.spec.js` for the broader functional coverage this suite doesn't
duplicate).

## What it protects

- Swipe/tap navigation across all 5 primary tabs, including the no-wrap-at-either-end and
  vertical-gesture-is-not-a-swipe guards (`navigation.spec.js`).
- Home's "Do This Next" overflow sheet stacking above the card with no stale state after
  close, twice (`home-sheet.spec.js`) — the specific regression class previously reported.
- Returns are always **derived** from the live timeline, never trusted from a persisted
  flag: historical Full↔Smaller edits, backfill removing a Return, deletion creating one,
  weekly-target recomputation, and Habit Log/Weekly Detail/Trends agreeing on the same
  seeded data (`returns.spec.js`).
- My Circle's last-talked/last-in-person derivation, including the legacy interaction
  format with no `countsAsSeen` field (`circle.spec.js`).
- Export/import round-trip with no data loss, a malformed import being rejected without
  corrupting existing state, plain reload persistence, and the one real bug this suite
  was born from — the My Circle hero eyebrow overlapping the action icons below ~480px
  (`persistence.spec.js`).
- Cheap accessibility invariants: icon-only buttons keep an accessible name, no duplicate
  ids, My People rail items expose the person's name (`accessibility.spec.js`).

## Running it

```
npm run test:regression
```

Runs only `tests/regression/` at the mobile-390 viewport (the app's primary width) for
speed. The full suite (`npm test`) still runs everything, including this folder, across
all three configured projects (mobile-390, mobile-430, desktop chromium).

## How it stays deterministic

- **State**: every test seeds `localStorage` directly before the app boots (same
  `seedState`/`boot` pattern as the other spec files) — never real user data, never
  random data.
- **Clock**: `page.clock.setFixedTime(...)` freezes "now" per test. The shared returns/
  cross-view timeline uses a fixed Wednesday (`2026-09-16`) chosen so the same three days
  fall inside both the current Monday-start week (Weekly Detail) and the last-7-day
  window (Trends) at once — avoids flakiness around week/midnight boundaries.
- **Service worker**: `boot()` unregisters any leftover service worker and clears caches
  via `addInitScript` before every navigation. A stale SW serving old JS previously
  produced false-negative results during manual QA; the suite starts genuinely clean on
  every run rather than relying on the browser profile being empty.
- **Console guard**: `helpers.js` exports a `test` fixture (not the raw `@playwright/test`
  one) that fails any test which logs a `console.error` or throws an uncaught exception
  during it.

## Selectors

Existing ids/classes/roles already used throughout `tests/workbench.spec.js` and
`tests/audit-integrity.spec.js` — no new `data-testid` attributes were needed or added.
