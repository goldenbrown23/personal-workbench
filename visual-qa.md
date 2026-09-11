# Return — Visual QA Workflow

**A UI task is not complete because the code compiles, because `index.html` loads with
no console errors, or because the diff "looks right" in the editor.** None of those check
what the change actually looks like or feels like on a screen. A task that touches
`index.html`, `styles.css`, or renders DOM in `js/*.js` is only complete once it has been
visually verified using the workflow below — see `CLAUDE.md`'s "For UI or frontend
changes, start the dev server and use the feature in a browser before reporting the task
as complete."

This is a living reference, same as `design-system.md` — if the app's breakpoints, run
command, or view structure change, update this file rather than letting it drift.

---

## 1. Run the app

Never eyeball static HTML/CSS by reading source — render it.

- Start the static server: `python -m http.server 8123` from the repo root (see
  `.claude/launch.json`), or use the `run` skill, which knows this project's launch
  config already.
- Load `http://localhost:8123/` in a real browser context, not just a file preview.
- This is a PWA (`manifest.webmanifest` + `sw.js`) — a hard refresh (disable cache /
  bump `CACHE_NAME` per `CLAUDE.md`) is sometimes needed to see a change, since the
  service worker will otherwise happily serve a stale cached asset. If a change doesn't
  appear, rule this out before assuming the change is broken.
- Confirm the app actually booted: no blank white screen, no console errors, `localStorage`
  state loads (or the fresh-install empty state renders correctly — see empty-state
  section of `design-system.md`).

## 2. Inspect the page

Don't just glance at the one element you changed — look at the whole screen it lives on.

- Screenshot (or view) the **entire view**, not a cropped region around the edit. A
  spacing fix three lines up can shift everything below it.
- Check every *state* the changed component can be in, not just the default: empty,
  loading, one item, many items, done/paused (`<details>`-collapsed), today vs. not
  today, light content vs. long user-entered text (long habit names, long notes —
  `overflow-wrap:anywhere` is used throughout specifically because user text is
  unbounded length).
- If the change touches a shared class (anything in `styles.css` used by more than one
  view), inspect **every view that uses it**, not just the one you were working on —
  grep `styles.css` for the class name first to find all call sites.

## 3. Compare against reference

- If the task started from a design reference (screenshot, mockup, Figma link, "make it
  look like X"), put the reference and the live render side by side and check them
  against each other directly — don't rely on memory of what the reference looked like.
- If there's no explicit reference, the reference is **`design-system.md`** plus the
  nearest existing analogous screen/component in the live app. A new card should be
  checked against an existing card of the same hierarchy level (Section 7 of
  `design-system.md`), a new button against the button hierarchy table, etc.
- Flag — don't silently "fix" — any deliberate deviation from the reference; note it to
  the user rather than assuming the reference was wrong.

## 4. Check at each breakpoint

This app is mobile-first with three concrete tiers in `styles.css`. Check the change at
representative widths in **each** tier, not just one:

| Tier | Width to test | CSS boundary |
|---|---|---|
| **Mobile** | ~375px (iPhone-class) and ~390–430px | base styles + `@media(max-width:520px)` |
| **Tablet** | ~600–850px | `@media(min-width:521px) and (max-width:899px)` |
| **Desktop** | ~1000px+ (also check ~900px, right at the boundary) | `@media(min-width:900px)` — rail nav replaces the bottom tabbar here |

- Resize the actual browser viewport (or use devtools device emulation) through these —
  don't just test one width and assume the rest inherit correctly. Fluid layouts and
  breakpoint-specific rules (hero crop `object-position`, tabbar layout, `.app` max-width/
  margin) diverge in ways a single-width check will miss.
- Pay specific attention to width transitions **right at** a breakpoint boundary (e.g.
  899px → 900px, where the tabbar flips from bottom bar to left rail) — this is where
  layout bugs concentrate.
- Desktop here is not a redesign, just whitespace + a rail nav around the same
  760px-max content column (see `CLAUDE.md`) — confirm the content column hasn't
  silently grown wider or been restyled.

## 5. Spacing

- Compare the changed element's padding/margin/gaps against the spacing table in
  `design-system.md` Section 1 — does it land on an existing value, or did a new
  arbitrary number get introduced?
- Check spacing *between* the changed element and its neighbors, not just its own
  internal padding — a correct card with wrong margin to the element above/below is
  still a visual bug.
- Check `body.compact` (the density override) separately if the changed component has
  compact-mode rules — confirm spacing still holds up, doesn't collapse, and doesn't
  fight the override.
- Check safe-area clearance: anything fixed/sticky or near the top/bottom edge must
  still clear `--safe-top`/`--safe-bottom`/`--nav-clearance` — don't let new fixed
  content sit under the status bar or behind the tabbar.

## 6. Typography

- Confirm size/weight/color against the hierarchy table in `design-system.md` Section 2
  — new text shouldn't invent a size or weight outside the established scale.
- Check line-height on any multi-line text, especially user-generated content (notes,
  long names) — cramped or excessive leading is easy to miss on short placeholder text
  and only shows up with real (longer) content.
- Check color contrast against the cream/paper background, especially `--muted` text on
  a tinted card background (gradient "moment" cards, tone-colored chips) — muted text
  that reads fine on `--card` can go low-contrast on a tinted surface.
- Re-check at mobile width specifically: `h1` and a few other rules resize at
  `≤520px` — confirm the smaller size still doesn't clip, truncate awkwardly, or
  wrap in an ugly place.

## 7. Image crop

Applies to the Home hero illustration and any other cropped/positioned imagery.

- Check every relevant `object-position`/`scale` variant, not just the default — the
  hero has **separate tuned crops per time-of-day period × per breakpoint**
  (`period-morning`/`afternoon`/`evening` × mobile/tablet/desktop). A crop fix at one
  combination doesn't guarantee the other eight are still right.
- Confirm the subject (the illustrated character/scene) reads as intentionally framed —
  not floating in empty space, not cut off at a limb/edge, not zoomed so far in it loses
  context.
- Re-check after any change to the hero container's aspect ratio/height — a crop tuned
  for one box height will misalign if the box height changes at a given breakpoint.

## 8. Overflow & clipping

- Confirm `html,body{overflow-x:hidden}` is still honored — no new element should cause
  horizontal scroll at any tested width. If you see a horizontal scrollbar or content
  bleeding past the viewport edge, that's a hard fail, not a nice-to-have fix.
- Check long/edge-case text specifically: long habit names, long person names, long
  notes. Most containers use `overflow-wrap:anywhere` deliberately — confirm new text
  containers do too, rather than silently clipping or overflowing their card.
- Check anything in a horizontally-scrollable strip (`.habit-filter`, `.filter-row`,
  the practice table on mobile) — scrolling should work, content shouldn't clip at the
  strip's edges, and the no-visible-scrollbar styling should still apply.
- Check `<details>`/expandable content (paused/done lists, settings disclosures,
  floating menus) in both collapsed and expanded states — expanding shouldn't clip
  against a modal's `max-height`/`overflow:auto` bounds or push content off-screen.
- Check modals/bottom sheets specifically at mobile height: `max-height:min(90dvh,760px)`
  content should scroll inside the sheet, not clip or extend past the viewport, and the
  sticky `.modal-actions` footer shouldn't cover content above it.

## 9. Responsiveness

- Beyond the three fixed breakpoints (Section 4), drag the viewport width freely between
  them and watch for anything that jumps, gaps, or briefly looks broken mid-resize —
  real users land on odd widths (split-screen, foldables, browser chrome variations),
  not just the exact tested breakpoints.
- Confirm touch-action / swipe gestures still work after the change — anything new added
  to `.app` or a primary-tab view must not fight `touch-action:pan-y` or block the swipe
  listeners; check `PRIMARY_TAB_VIEWS`/`SWIPE_VIEWS` in `app.js` if the change touches a
  primary tab view.
- Confirm tap targets are still ≥44px in their shortest dimension at every width tested
  — a target that's comfortably 44px on desktop can shrink below that at mobile width if
  sizing was done with relative units that didn't account for the smaller viewport.

## 10. Interaction testing

Static appearance is not enough — actually use the feature.

- **Walk the golden path end to end**: the primary action a user would take (log a
  habit, add a person, complete a check-in) start to finish, in the browser, not just
  reading the code that implements it.
- **Test every interactive state**: default, `:hover` (desktop), `:active` (press —
  confirm the `scale(.98)` feedback fires), `:focus-visible` (tab through with keyboard
  — confirm a visible outline appears and focus order is logical), `:disabled` where
  applicable.
- **Test edge cases the code path allows**: double-tapping a log button (confirm no
  double-submit), rapid tab-switching mid-animation, opening a second modal while one is
  open, submitting a form with only whitespace, canceling out of a multi-step flow
  partway through.
- **Test undo/reversal paths**: if the feature has a toast-undo or reversible action
  pattern (see `design-system.md` Section 8), confirm undo actually restores the prior
  state, not just that the toast appears.
- **Re-run after fixing a bug found in this step** — a fix for one interaction bug can
  introduce or reveal another; don't consider interaction testing done after the first
  pass that surfaces a problem.

---

## Pre-completion checklist

Before telling the user a UI task is done, confirm every line below — don't just assert
"looks good," actually check each one in the running app:

- [ ] App was started and the change was viewed running in a browser (not just read as
      source, not assumed from the diff)
- [ ] Full view inspected, not just the changed element in isolation
- [ ] All relevant component states checked (empty, populated, long-content, collapsed/
      expanded, today/not-today, etc. — whichever apply)
- [ ] Compared against the design reference (explicit reference if given, otherwise
      `design-system.md` + nearest analogous existing component)
- [ ] Checked at mobile width (~375–430px)
- [ ] Checked at tablet width (~600–850px)
- [ ] Checked at desktop width (~1000px+, and right at the 900px rail-nav boundary)
- [ ] Spacing matches the established scale, including margin to neighboring elements
      and `body.compact` if applicable
- [ ] Typography (size/weight/color/line-height) matches the hierarchy, checked with
      real/long content, not just short placeholder text
- [ ] Image crop (if touched) checked across all period × breakpoint combinations, not
      just the default
- [ ] No horizontal overflow/scroll at any tested width
- [ ] No clipped or cut-off content in `<details>`, modals, scroll strips, or long-text
      cases
- [ ] Resized freely between breakpoints, not just tested at the three fixed widths
- [ ] Touch-action/swipe gestures still work if a primary-tab view was touched
- [ ] Tap targets stay ≥44px at every width tested
- [ ] Golden-path interaction walked start to finish in the browser
- [ ] Hover/active/focus-visible states checked; keyboard focus order is logical
- [ ] Edge-case interactions tried (double-tap, rapid navigation, overlapping modals)
      and no double-submit or broken state resulted
- [ ] Any bug found during QA was fixed and **re-checked**, not just patched and assumed
      fixed

If any box can't honestly be checked — for example, no visual rendering was available in
this session — **say so explicitly** rather than reporting the task as visually
complete. "Type-checked and unit-tested, but I could not visually verify this in a
browser" is an acceptable and honest status. "Looks correct" without having looked is
not.
