# Personal Workbench — Operating Manual

This is the permanent reference for working on this project. Read it before making
changes. It exists so behavior stays consistent across sessions, not to be re-derived
each time.

## Project Knowledge Hierarchy

Before beginning any task, read and follow the project's documentation in this order:

1. CLAUDE.md
2. design-system.md
3. Any task-specific reference images, mockups, or specifications provided in the current request.

These documents are the authoritative source of truth for this project.

Do not rely on assumptions or generic best practices when the project documentation already defines a standard.

When documentation and existing implementation differ:

- Treat the implementation as potentially outdated.
- Follow the documented intent unless there is evidence the implementation intentionally evolved beyond it.
- If uncertain, explain the discrepancy before changing behavior.

Do not begin implementation until the relevant documentation has been reviewed.

## CLAUDE.md Editing Policy

This file is the project's permanent operating manual, not a scratch pad — edits to it
deserve the same care as edits to shipped code.

- Read this entire file before editing any part of it. A change made without reading the
  surrounding sections is how contradictory or duplicate guidance creeps in.
- Never delete or replace existing guidance to make room for new guidance unless it is
  actually wrong or superseded by a deliberate decision — and say so when that happens.
- Integrate a new capability into the most relevant existing section rather than
  appending a new top-level section for something that already has a home. Only add a
  new section when the guidance genuinely doesn't fit anywhere else.
- Check for overlap before writing: if two sections would end up saying the same thing
  two different ways, merge them, or have one point to the other, instead of duplicating.
- Match the existing voice — bolded lead phrases, prose bullets grounded in actual
  file/selector/variable names (`--accent`, `WORKBENCH_ICONS`, `PRIMARY_TAB_VIEWS`) — not
  generic advice or terse imperative fragments that read like a different document.
- If the live implementation and this document disagree, don't quietly edit this file to
  match the code (or the reverse) — flag the discrepancy per "Project Knowledge
  Hierarchy" above and confirm which one is actually correct first.

## What this project is

Personal Workbench ("Return") is a calm, mobile-first PWA for building small habits and
staying connected to the people who matter — not a productivity/scoreboard app. Vanilla
HTML/CSS/JS, no framework, no build step. `index.html` + `styles.css` + `js/*.js`, served
as static files and installable via `manifest.webmanifest` + `sw.js`.

Core views: Home, Habits, My Circle (relationships), Weekly Detail (Trends), Settings,
plus a "Your Workbench" (More) module registry for anything added later.

## Mission

Help someone gently return to good habits and their relationships — without shame,
streak-anxiety, or overwhelm. Every feature should make the next small action easier,
not add pressure. When in doubt, favor the version that feels kinder.

## ADHD-first principles

The primary user model is an ADHD brain: low working memory for multi-step flows, low
tolerance for friction, and a strong aversion to guilt-based UI.

- **One primary action per screen.** Never make the user choose between two competing
  calls to action.
- **Low friction beats completeness.** A habit check-in is one tap. Never gate a common
  action behind a modal, confirmation, or multi-field form.
- **No guilt mechanics.** No red streak counters that punish a miss, no "you failed"
  language, no shaming empty states. Missed days are just... missed. "Quiet / paused"
  and "Return, don't redesign" (see `practiceView`) are the house tone.
- **Small working-memory footprint.** Don't require the user to remember state across
  screens. Surface what's relevant now (`homeNow`, today's habits) rather than making
  them navigate to find it.
- **Forgiving defaults.** Undo over confirm dialogs. Reversible over blocking.

## Chinese productivity inspiration (养生 / 慢生活 sensibility)

Draw on the 养生 (nurturing life) and 慢生活 (slow living) tradition rather than Western
grindset productivity: cyclical rhythm (morning/afternoon/evening blocks, seasons of
effort) instead of linear streak-maximization; rest and "quiet" states are legitimate,
not failure states; small consistent gestures (tea, a walk, a check-in) matter more than
heroic effort. This shows up directly in the habit period model (morning/afternoon/
evening) and in copy that treats pausing a habit as self-care, not abandonment.

## Design philosophy

- Warm, paper-like palette: cream background (`--bg:#f7f1e6`), warm off-white cards
  (`--card:#fffcf6`), terracotta accent (`--accent:#bd6440`), soft muted category tones
  (sage/blue/lavender/peach/rose/sand/gray). Never introduce cold blues/grays as a
  primary palette or bright saturated "app" colors — it breaks the tone.
- Soft, rounded, low-contrast shadows (`--radius:20px`, `--shadow:0 10px 30px
  rgba(90,60,35,.08)`). Nothing should look sharp, harsh, or clinical.
- Icons are hand-picked line icons from the shared `WORKBENCH_ICONS` set in `state.js`
  (Lucide-style, `stroke-width:1.8`, rounded caps). Reuse existing icons before adding a
  new one; keep new icons in the same stroke style.
- Illustration-led moments (the Home hero) are allowed to be expressive; chrome/UI
  elements stay understated so the content and illustrations lead.

## UX philosophy

- Content and state first, chrome second. Headers are quiet (`eyebrow` + `h1` + `sub`);
  the checklist/list/card content is the star.
- Navigation is a small, fixed set of primary tabs (Home, Habits, My Circle, Trends) plus
  a "More" catch-all — read live from the DOM (`PRIMARY_TAB_VIEWS`), never hardcoded, so
  a new module doesn't require touching swipe/tab logic in multiple places.
  New feature areas belong in the `WORKBENCH_MODULES` registry, not as new bottom tabs.
- Swipe and tap-transition direction should stay predictable: only adjacent primary tabs
  animate directionally; everything else (Settings, Weekly Detail, modals) is a plain
  instant swap.
- Empty/paused/done states get their own collapsed `<details>` sections rather than
  cluttering the primary list — reduce what's visible by default, not what's possible.

## Coding standards

- No build step, no bundler, no framework. Plain functions and globals in `js/*.js`,
  loaded via `<script>` tags in `index.html`. Keep it that way unless the user explicitly
  asks to introduce tooling.
- State lives in one place (`state.js` / the `state` object), persisted via
  `saveState()` to `localStorage` under the existing versioned keys
  (`STORAGE_KEY`, `VIEW_KEY`, etc.). Don't invent parallel storage or new top-level keys
  without checking existing ones first — migrations already exist for renamed values
  (see `TONE_MIGRATIONS`); follow that pattern rather than breaking old saved data.
  When shipping a change that touches saved-state shape, expect existing user data and
  branch/migrate — never assume a clean slate.
- Render functions are idempotent `renderX()` functions that rebuild `innerHTML` from
  state; call the relevant `renderX()` (or `renderAll()`) after any state mutation
  rather than hand-patching the DOM.
- Escape all user-provided text into HTML with `escapeHTML`/`escapeAttr`/`jsEscape`
  (already used throughout `state.js`/`app.js`) — never interpolate raw user input into
  `innerHTML` or an inline `onclick`.
- Comment only the non-obvious "why" (see existing comments in `app.js`/`styles.css` as
  the house style) — not what the code does. Don't add narration comments.
- Don't add abstractions, config layers, or frameworks for a single use case. Three
  similar inline blocks are fine; don't extract a helper until there's a real second
  caller with genuinely shared logic.

## Responsive design rules

- Mobile-first, single-column, `max-width:760px` centered layout (`.app`). Design for
  ~360–430px width first, then confirm it still reads fine up to 760px.
- Respect safe areas everywhere: use the existing `--safe-top`/`--safe-bottom` tokens and
  `--nav-clearance` for anything fixed/sticky or near the top/bottom edge — never a
  one-off `env(safe-area-inset-*)` calc.
- `touch-action` matters here: the app relies on swipe gestures between tabs. Don't add
  elements that fight `.app`'s `touch-action:pan-y` or block swipe detection without
  checking `PRIMARY_TAB_VIEWS`/`SWIPE_VIEWS` in `app.js`.
- Never let content scroll horizontally; `html,body{overflow-x:hidden}` is intentional.
- Tap targets should stay comfortably large (buttons already use `touch-action:manipulation`
  and a pressed-state `scale(.98)`) — don't shrink interactive elements below thumb-friendly
  size for density's sake.
- Writing responsive CSS and verifying it actually works are two different steps —
  see "Design Review Policy" for the breakpoints to check and `visual-qa.md` for the
  full procedure once a change is implemented.

## Accessibility principles

- Every icon-only button needs `aria-label`; decorative SVGs get `aria-hidden="true"`
  (follow the existing pattern in `index.html`/`state.js`).
- Preserve `role="tablist"`/`role="tab"` semantics on segmented controls and tab bars.
- Maintain sufficient contrast against the cream/paper palette — check new text/background
  pairings against the existing `--text`/`--muted`/tone-text variable pairs rather than
  picking arbitrary colors.
- Respect `prefers-reduced-motion` for any new animation (check existing animation rules
  in `styles.css` before adding motion).
- Keep focus order logical when adding new interactive elements; don't rely on JS click
  handlers alone where a native `<button>`/`<a>` would work.

## Visual consistency rules

- Reuse existing CSS custom properties (`--bg`, `--card`, `--accent`, `--muted`, tone
  pairs, `--radius`, `--shadow`) instead of introducing new literal colors/radii/shadows.
  The `--surface`/`--primary`/etc. aliases exist for new code that reads clearer with
  those names — use whichever alias reads best, but don't add a third naming scheme.
- New card/list/button styles should visually match existing card/list/button patterns
  in `styles.css` (same radius, shadow, spacing rhythm) — grep for a similar existing
  component before writing new CSS from scratch.
- New icons must come from or match the style of `WORKBENCH_ICONS` (24x24 viewBox,
  `stroke-width:1.8`, rounded linecap/linejoin, `currentColor`).
- Copy tone stays warm, plain, and non-clinical — avoid corporate/productivity-app
  language ("streak," "score," "optimize"); prefer the app's existing voice ("Small
  actions," "Return, don't redesign," "Quiet / paused").

## When to ask vs. when to decide

Ask the user first when:
- The change affects saved user data shape/migration and could lose or corrupt existing
  data.
- The change is visually or structurally significant (new tab, new module, major layout
  rework, palette change) rather than an extension of an existing pattern.
- There's a genuine tradeoff with no clear "matches existing convention" answer.
- The user's request is ambiguous about *which* existing feature/view it targets.

Just decide and proceed when:
- The task is a bug fix, small copy tweak, or extension of an existing, well-established
  pattern (new icon in an existing group, new habit tone, new item in an existing list
  style).
- The "house style" already answers the question (palette, spacing, icon style, copy
  tone, safe-area handling) — apply it rather than asking which color/radius to use.
- A reasonable default clearly serves the mission (calm, low-friction, ADHD-first) even
  if unstated.

## Maintaining design quality (do this on every task)

1. Before adding new CSS, search `styles.css` for an existing class/pattern that already
   does something close — extend or reuse it rather than duplicating.
2. Before adding a new color, radius, or shadow value, check the `:root` tokens first.
3. After any UI change, actually run it (via the `run` skill) and check it at mobile,
   tablet, and desktop — see "Design Review Policy" below for the breakpoints and the
   full procedure — and confirm safe-area/tabbar clearance still holds at each.
4. Keep new copy in the app's existing calm, non-judgmental voice — read it back and ask
   "would this make someone feel behind?" If yes, rewrite it.
5. Don't ship a feature that requires the user to remember something across screens or
   make more than one decision to do the common-case action.
6. **Bump `CACHE_NAME` in `sw.js` on every deploy/update that changes cached assets** —
   otherwise update-detection silently breaks for installed PWA users.

## Design Review Policy

Visual correctness outranks implementation correctness — a UI task is not done because
the code compiles or the diff looks right in the editor. The rendered interface is the
source of truth, not the source code.

For every UI-affecting task:
- **Implement, then actually run the app and look at it** (via the `run` skill or the
  project's static server, see `.claude/launch.json`) before calling anything finished —
  never assume correctness from source alone.
- **Compare against a reference.** Use any mockup/screenshot supplied with the task; if
  none was supplied, the reference is `design-system.md` plus the nearest existing
  analogous pattern already in the app (see "Maintaining design quality" above).
- **Check mobile, tablet, and desktop** — see "Responsive Visual QA" immediately below
  for this app's actual breakpoints and where the full procedure lives.
- **Iterate until it's visually correct**, not until it merely renders without errors.
  Fix discrepancies and re-check rather than accepting the first render.
- If a supplied mockup conflicts with an existing pattern in this document or
  `design-system.md`, explain the tradeoff before implementing rather than silently
  picking one.

### Responsive Visual QA

This app has three real breakpoints, not just "mobile" and "desktop": mobile (~375–430px,
base styles plus `@media(max-width:520px)`), tablet (~600–850px,
`@media(min-width:521px) and (max-width:899px)`), and desktop (~900px+, where the bottom
tabbar becomes the left rail — see "Responsive design rules" above). Check a change at
all three, and specifically right at the 900px boundary where the nav layout itself
changes, rather than assuming one width represents the rest.

`visual-qa.md` has the full repeatable procedure and pre-completion checklist (run app →
inspect → compare → check each breakpoint → spacing/typography/image-crop/overflow →
interaction testing) — follow it before reporting any UI task complete, including small
changes that "shouldn't" affect layout. If a visual check genuinely can't be performed in
a given session, say so explicitly rather than reporting the task as visually complete.