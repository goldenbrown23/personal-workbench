# Return — Design System

This is a living reference, not a spec frozen at ship time. When a screen needs
something new, look here first for the closest existing pattern and extend it. When you
add a genuinely new pattern, add it here too — this document should always describe the
app as it actually is, not as it was designed on day one. If you find a mismatch between
this file and `styles.css`, trust the CSS and fix this file.

Every rule below exists to serve the same goal: help someone gently return to good
habits and their relationships, without shame or overwhelm. When a design decision is
ambiguous, resolve it toward the calmer, lower-pressure option — see `CLAUDE.md` for the
full ADHD-first / 慢生活 (slow living) philosophy this system is built on.

---

## 1. Spacing scale

There is no formal `--space-*` token scale (the codebase doesn't need one at its current
size) — but a consistent rhythm has emerged from repeated values in `styles.css`. Treat
these as the de facto scale and reach for them before picking an arbitrary number:

| Value | Used for |
|---|---|
| `2–4px` | micro gaps: icon-to-label, dot gaps, badge padding |
| `6–9px` | gaps within a compact row (chip rows, avatar+text, pill internals) |
| `10–14px` | standard internal card padding, gaps between a card's own sections |
| `15–18px` | card padding for larger/hero cards (`.circle-hero-card`, `.trend-insight`) |
| `12–16px` | vertical gap between stacked cards in a list (`.habit-list`, `.circle-list`) |
| `18–24px` | section-to-section spacing (`.section-head` margin, `.settings-group`) |

Guidance:
- Pick the closest existing value rather than inventing a new one (e.g. `13px` instead
  of `12px` "because it looks a bit tighter") — the eye reads consistency, not precision.
- Related content (a title + its subtitle, an icon + its label) sits at the tight end
  (2–9px); unrelated sections need the loose end (18px+) to read as separate.
- Denser variants exist deliberately (`body.compact`) for users who want more on screen —
  never hardcode around it; new cards should inherit spacing from their existing class
  rather than fixed pixel values that fight the compact override.

## 2. Typography hierarchy

One system font stack, no custom webfonts:
`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.

| Role | Size | Weight | Example |
|---|---|---|---|
| Page title (`h1`) | 32px (26px on Home, 29px at ≤520px, 38px on desktop) | default | "Good morning" |
| Eyebrow (`.eyebrow`) | 13px, uppercase, `.02em` tracking | 650 | "TUESDAY, JUNE 4" |
| Sub / description (`.sub`) | 15px (13px on Home) | default | header supporting line |
| Section heading (`.section-head h2`) | 18px, `-.01em` tracking | default | "Today's habits" |
| Card title (`.habit-name`, `.person-name`) | 17px, `-.01em` to `-.012em` tracking | 760–820 | habit/person name |
| Body / list copy | 13–14.5px | 600–780 | list rows, notes |
| Micro / meta (`.muted`, help text, labels) | 11–12px | 600–800 | timestamps, hints |
| Big number (`.metric-value`, `.trend-headline`) | 22–25px, tight tracking (`-.02em`/`-.03em`) | 820–860 | streak-free counts, insight headline |

Rules:
- Weight does more work than size for hierarchy — most of the scale sits in a narrow
  13–18px band, and importance is signaled by going bold (700–860), not bigger.
  This keeps screens calm instead of shouty.
- Negative letter-spacing (`-.01em` to `-.03em`) is reserved for large/bold numerals and
  headings — it's what makes big text feel considered rather than default-browser.
- `--muted` is the only secondary text color. Don't introduce a third text tone; if
  something needs to recede further, reduce weight/size before reaching for opacity or a
  new color.
- Uppercase + letterspacing (`.eyebrow`, `.section-label`, table headers) is the one
  recurring "label" treatment — reuse it for any new small-caps category label instead
  of inventing another convention.

## 3. Border radius

Radius scales with size, not randomly:

| Radius | Used for |
|---|---|
| `999px` (pill) | chips, filter pills, status badges, progress tracks, toggle switches |
| `50%` (circle) | true circles are reserved for status dots and the settings toggle knob — avatars-as-circles are rare here; prefer rounded squares (below) |
| `9–11px` | small icon chips, tiny buttons |
| `12–14px` | inputs, standard buttons, icon containers (avatars, emoji tiles) |
| `15–18px` | secondary cards, list rows, modest containers |
| `20px` (`--radius`) | **default card radius** — the app's signature roundness |
| `22–24px` | hero/feature cards (`.circle-hero-card`, `.module-card`, modal sheet) |

Guidance: the larger and more "featured" a surface is, the more radius it gets. Never go
sharper than ~9px on anything — hard corners read as clinical/productivity-app, which is
exactly the tone this app avoids. When unsure, use `var(--radius)` (20px).

## 4. Shadows

One shadow does almost all the work: `--shadow: 0 10px 30px rgba(90,60,35,.08)` — soft,
warm-toned (brown, not black), low-opacity. It's used on every standard card
(`.habit-card`, `.person-card`, `.week-card`, `.stat-list`, `.home-widget`, etc).

A few surfaces intentionally deviate:
- **Elevated/floating chrome** (tabbar, toast, update-card, modal, floating menu) gets a
  stronger, more standard shadow (`0 12–20px 35–70px rgba(...,.12–.2)`) because it sits
  above the content plane, not within it.
- **Warm gradient "moment" cards** (`.home-now`, `.trend-insight`, `.circle-footer-banner`,
  `.rescue-card`) use a matched-hue soft shadow (e.g. `0 6px 18px rgba(180,100,55,.08)`)
  rather than the neutral card shadow, so the glow matches the gradient.
- **Quiet state** (`.home-now.quiet`) drops the shadow to `none` — visually flattening a
  card is how the system signals "nothing urgent here" without words.

Rule: shadow is a proximity/emphasis signal, not decoration. Flat = quiet/paused. Warm
glow = a gently important moment. Standard `--shadow` = normal content. Strong shadow =
floating above everything else (temporary, dismissible chrome only).

## 5. Color palette

Warm, paper-toned, desaturated — never cold blue/gray as a primary, never bright
saturated "app" colors.

**Base**
- `--bg #f7f1e6` cream background
- `--card #fffcf6` warm off-white surface
- `--text #3a2f27` warm near-black
- `--muted #8a7a6b` warm gray-brown for secondary text
- `--line #ece1d1` hairline borders
- `--accent #bd6440` terracotta — the one saturated color, used sparingly for primary
  actions, active states, and the small amount of "this matters" emphasis
- `--danger #a1523f` for destructive actions only (delete, danger banners)

**Tone pairs** (background + matching text color, always used together — never mix a
tone's background with a different tone's text):

| Tone | Background | Text | Typical meaning |
|---|---|---|---|
| green | `--green #e9edd9` | `--greenText #55692f` | done, good standing, positive |
| yellow | `--yellow #f7ecd1` | `--yellowText #8a6a2c` | soon/counted, mild attention |
| gray | `--gray #f1ebe0` | `--grayText #6b5f52` | missed/neutral — deliberately *not* red |
| purple | `--purple #f2e2d8` | `--purpleText #8a5a3f` | "returned"/reconnection, gentle notes |

Extended chip/tag tones (`.tone-sage`, `.tone-lavender`, `.tone-rose`, `.tone-blue`,
`.tone-peach`, `.tone-teal`, `.tone-sand`, `.tone-gray`) exist for user-facing category
tagging (habit categories, relationship tags) where more variety is needed — same
desaturated, paper-toned family, same "pastel background + saturated-but-muted text"
formula.

**Semantic aliases** (`--surface`, `--surface-soft`, `--primary`, `--primary-soft`,
`--success`, `--text-secondary`, `--border`) map onto the tokens above. They exist so new
code can read more clearly by intent; they are not a second source of truth. Pick
whichever naming reads best at the call site, but don't introduce a third naming scheme.

**The one deliberate rule-break:** missed habits use **gray**, not red. A miss is not a
failure state that needs alarm color — see the ADHD-first "no guilt mechanics" principle.
Red (`--danger`) is reserved for genuinely destructive/irreversible actions, never for
"you didn't do the thing."

Before adding any new color: check whether an existing token/tone pair already covers
the meaning you need. A new literal hex value should be rare and should match the
palette's warmth (never introduce a cool gray or saturated primary blue/green/red).

## 6. Icon usage

All icons come from the shared `WORKBENCH_ICONS` registry in `state.js`, rendered via
`iconSVG()`: 24×24 viewBox, `stroke="currentColor"`, `stroke-width:1.8`, rounded
linecap/linejoin, no fill. This is a strict, single visual language — Lucide-style line
icons, nothing else.

- **Always check `WORKBENCH_ICONS` for an existing icon before adding a new one.** Reuse
  beats a near-duplicate.
- Icons inherit color via `currentColor` — never hardcode an icon's stroke color; set
  color on the container instead (tone classes like `.tone-green`, `.settings-list-icon`
  variants already do this).
- Standard icon sizes are small and consistent: 14–16px inline/inside pills, 18–23px
  inside icon tiles (`.icon-btn`, `.emoji`, `.checklist-icon`, `.stat-icon`), never
  larger than ~27px even in a "hero" avatar context.
- Icon containers ("icon tiles") are rounded squares (12–16px radius) with a soft tinted
  background, not bare icons floating on the card — this is the standard way to give an
  icon visual weight (`.checklist-icon`, `.stat-icon`, `.home-widget-icon`,
  `.settings-list-icon`).
- Every icon-only interactive element needs `aria-label`; every purely decorative icon
  gets `aria-hidden="true"` (icons rendered through `iconSVG()` already carry
  `aria-hidden="true"` by default — the wrapping button is what needs the label).
- If a new icon is truly needed, draw it at the same 24×24 grid with the same
  stroke-width/linecap so it's indistinguishable in weight from the existing set.

## 7. Card hierarchy

Cards are the primary content unit; there's a clear pecking order by radius + shadow +
padding, from quietest to loudest:

1. **Inline/nested surface** — `#fbf7ef` background, `--line` border, 13–17px radius, no
   shadow (e.g. `.goal-plan`, `.detail-facts`, `.tag-choose-btn` backgrounds). Used for
   content living *inside* another card, or minor secondary containers.
2. **Standard card** — `--card` background, `--line` border, `var(--radius)` (20px),
   `var(--shadow)`. The default for list items and content cards (`.habit-card`,
   `.person-card`, `.week-card`, `.stat-list`, `.home-widget`, `.settings-card`). This is
   the baseline — reach for it first.
3. **Feature/hero card** — larger radius (22–24px), often a subtle warm gradient instead
   of flat `--card`, sometimes a stronger tinted shadow (`.circle-hero-card`,
   `.module-card`, `.quick-card`, `.practice-intro`). Reserved for the one or two most
   important cards per screen — a screen with three "hero" cards has none.
4. **Moment/insight banner** — full gradient background (`linear-gradient(145deg, ...)`),
   no hard border (or a very soft tinted one), used for a single callout that's meant to
   feel warm and noticed without being alarming (`.home-now`, `.trend-insight`,
   `.circle-footer-banner`, `.rescue-card`). These never stack — one per screen.

Within a standard card, the internal hierarchy is: icon tile → title (bold, 14–17px) →
supporting muted text (11–13px) → optional status/action at the trailing edge. Don't
invert this (e.g. muted text above the title) without a specific reason.

## 8. Interaction patterns

- **One primary action per screen/card.** Never present two competing calls to action at
  equal visual weight — if a card needs both a "do it" and an "adjust it" action, one is
  visually primary (`--accent` fill) and the other is secondary/quiet (outline or
  text-only), per `.do-next-btn.primary` / `.do-next-btn.secondary`.
- **Tap targets stay ≥44px** in the shortest dimension (buttons, list rows, icon
  buttons) — this is enforced throughout (`min-height:44px`/`46px`/`48px` recurs
  constantly). Don't shrink below this for density.
- **Press feedback is a scale, not a color flash**: `button:active{transform:scale(.98)}`
  applies globally. New interactive elements should be real `<button>`/`<a>` elements so
  they inherit this for free, rather than a `<div>` with a click handler.
- **Progressive disclosure via `<details>`**, not modals, for "stuff that's usually not
  needed right now": paused/done habit lists, settings sections, review filters, goal
  plan advanced fields. This is the house pattern for reducing what's visible by default
  without removing what's possible — reach for `<details>` before reaching for a new
  modal or a "show more" button with custom JS state.
- **Modals are bottom sheets**, not centered dialogs: they slide up from the bottom
  (`sheetUp` keyframe), anchor to the bottom edge on mobile, and are reserved for actual
  multi-field forms (add/edit habit, add/edit person) — never for a single confirmation
  that could be a lighter-weight pattern (toast + undo, inline state change) instead.
- **Undo over confirm.** Prefer letting an action happen and offering undo (toast
  pattern) over a blocking confirmation dialog, except for genuinely irreversible/
  destructive actions (`.danger-row`, `.btn.danger`, clear-data flows), which do get an
  explicit, separately-styled confirm step.
- **Segmented controls** (`.segmented`) for switching between a small fixed set of views
  within a screen (e.g. week/month); **filter chips** (`.filter-chip`, horizontally
  scrollable, no visible scrollbar) for filtering a list. Don't use a dropdown/select
  where a segmented control or chip row already covers the choice count.
- **Floating popovers** (`.floating-menu-panel`) for contextual per-row menus (overflow
  "⋯" actions) are positioned by JS (`positionFloatingPanel`), never CSS-anchored to an
  ancestor, and collapse into a bottom sheet when there's no room — reuse this component
  for any new per-item overflow menu rather than building a new popover mechanism.

## 9. Animation philosophy

Motion here is quiet and functional — it orients, it never performs.

- **Tab transitions** (`viewSlideFromRight`/`Left`) are a short (320ms) slide + soft
  scale + blur-in, only between *adjacent* primary tabs, so swiping feels like moving
  along one continuous strip rather than a hard cut. Non-adjacent navigation (Settings,
  Weekly Detail, modals) is a plain instant swap — direction should only ever imply a
  real spatial relationship the user already understands (left/right on the tab bar),
  never be added just for polish.
- **Sheets slide up** (`sheetUp`, 220ms ease-out) — modals arrive from the bottom edge
  they're anchored to, reinforcing that they're a temporary layer over the current
  screen, not a new screen.
- **Toasts/update-cards** fade + rise (`opacity`/`translateY`, 200ms) from the bottom,
  above the tab bar — brief, dismissible, never blocking.
- **State transitions are short** (150–250ms) and use standard or `cubic-bezier(.22,1,.36,1)`
  easing — nothing bounces, nothing overshoots. This is a calm app; springy/bouncy motion
  would read as playful-app energy that fights the 养生/slow-living tone.
- **`prefers-reduced-motion: reduce` disables the tab-slide animation entirely** — any
  new animation must have a corresponding reduced-motion override, checked against
  existing rules in `styles.css` before shipping.
- Motion should never be the only signal for a state change (see shadows/color for how
  "quiet" states are communicated instead) — it's a transition aid, not the message.

## 10. Empty state design

Empty and "nothing to do" states are treated as calm, legitimate states — never a dead
end or a guilt trip.

- **No shaming copy.** "Nothing to catch up on," never "you have no activity" framed as
  a gap. Compare the review history subhead: *"Only what happened. Nothing to catch up
  on."*
- **Collapsed by default via `<details>`**, not deleted from view: done/paused habits,
  empty note lists (`.empty-notes`), quiet history days (`.history-quiet`) get their own
  softly-styled, low-emphasis block rather than being hidden entirely or given equal
  visual weight to active content.
- **Visually quiet, never blank.** An empty list still gets a card
  (`.empty-card`/`.circle-empty-row`/`.overview-empty`) with `--muted` text — same
  card language as content, just with nothing loud inside it. Never leave truly blank
  whitespace where a user might wonder if something's broken.
- **"Quiet" is a real, named state**, not just "empty." `.home-now.quiet` flattens
  shadow and hides action buttons — this is the pattern for "there's nothing urgent
  right now" as opposed to "there's nothing at all" (empty) — they should look
  different from each other.
- When writing new empty-state copy: read it back and ask "would this make someone feel
  behind?" If yes, rewrite it in the plain, warm voice ("Return, don't redesign," "Small
  actions") rather than a productivity-app absence framing ("No data," "0 results").

## 11. Illustration usage

Illustration is reserved for a small number of expressive, mood-setting moments — it is
not a decorative layer sprinkled throughout the UI.

- **The Home hero banner** (`#homeIllustrationImg` / `.home-hero-bg`) is the app's one
  full-bleed illustrated moment: a time-of-day photo/illustration filling the header band
  edge-to-edge, with text overlaid directly on it (color-flipping light/dark per period
  via `.is-dark`). This is intentionally the most expressive surface in the app — chrome
  everywhere else stays understated specifically so this can lead.
- Each time-of-day period (`morning`/`afternoon`/`evening`) gets its own tuned
  `object-position`/`scale` crop per breakpoint — illustration art-direction is
  re-tuned per screen size, not just proportionally scaled, so the subject always reads
  intentionally framed rather than randomly cropped.
- **Small inline mascots** (`.circle-mascot`, `.settings-mascot`, 76–88px, simple line-art
  SVG) appear as a companion beside a banner/hero card's text — supporting decoration for
  a specific moment (My Circle intro, Settings hero), not a recurring pattern to place on
  every card.
- Everywhere else, icons (Section 6) — not illustration — carry visual meaning. If a new
  screen wants "personality," prefer copy tone and the existing icon set before reaching
  for a new illustration; a new full illustration is a "visually significant" change (see
  `CLAUDE.md`'s "when to ask" section) and should be discussed first, not added ad hoc.

## 12. Button hierarchy

| Level | Style | When |
|---|---|---|
| **Primary** | `--accent` fill, white text (`.btn.primary`, `.do-next-btn.primary`, `.circle-hero-btn.primary`) | the one main action on a screen/card — logging a habit, saving a form |
| **Secondary** | Tinted terracotta background (`#f3e6d8`/`#ecd6bc` border), accent-colored text, no fill (`.do-next-btn.secondary`, `.icon-btn.active`, `.visual-change`, `.settings-hero-btn`) | a real but non-primary action alongside a primary one |
| **Neutral/outline** | `--card` or transparent background, `--line` border, `--text` color (`.btn`, `.tiny-btn`, `.update-card-actions button`) | default/dismiss actions, "not now," neutral list-row actions |
| **Text/link** | No border or fill, `--accent` colored text (`.link-btn`, `.home-now-link`, `.circle-view-all`) | low-emphasis navigational or "view all" actions |
| **Danger** | `--danger` text, soft red-tinted background (`#fff8f8`/`#eddcdc`) — never a solid red fill (`.btn.danger`, `.danger-row`, `.floating-menu-option.danger`) | destructive actions only; kept visually restrained, not alarmist |

Rules:
- A screen or card should have **exactly one primary button** at most. If two actions
  are both genuinely needed (e.g. Home's "log it" + "not today"), the second is always
  secondary or text-level, never a second primary.
- Danger actions are deliberately *not* loud/red-filled — they're distinguishable by
  color and label, not by visual alarm, consistent with the no-guilt/no-punishment tone.
- All buttons share the same physical language regardless of hierarchy level: rounded
  (12–16px typically), 44px+ min-height, `scale(.98)` press feedback. Hierarchy is
  communicated through color/fill weight only — never through size, radius, or motion
  differences between button levels.
