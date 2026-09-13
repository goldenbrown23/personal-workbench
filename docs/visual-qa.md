# Visual QA procedure

The repeatable procedure for verifying a UI-affecting change, referenced from
`CLAUDE.md`'s "Design Review Policy" and "Responsive design rules". Follow this before
reporting any UI task complete — including small changes that "shouldn't" affect layout.
See `docs/design-qa.md` for a worked example of this procedure applied to one past change
(the Trends hero).

## Procedure

1. **Run the app.** Use the `run` skill, or the project's static server per
   `.claude/launch.json`, and actually load the changed view — never assume correctness
   from source alone.
2. **Inspect.** Look at the rendered result directly (screenshot or live browser), not
   just the diff.
3. **Compare against a reference.** Use any mockup/screenshot supplied with the task; if
   none was supplied, compare against `docs/design-system.md` plus the nearest existing
   analogous pattern already in the app.
4. **Check each breakpoint.** This app has three real breakpoints, not just "mobile" and
   "desktop":
   - Mobile: ~375–430px (base styles plus `@media(max-width:520px)`)
   - Tablet: ~600–850px (`@media(min-width:521px) and (max-width:899px)`)
   - Desktop: ~900px+ (the bottom tabbar becomes the left rail)

   Check specifically right at the 900px boundary, where the nav layout itself changes,
   rather than assuming one width represents the rest.
5. **Check spacing, typography, image crop, and overflow** at each breakpoint — confirm
   safe-area/tabbar clearance holds (`--safe-top`/`--safe-bottom`/`--nav-clearance`), and
   that nothing scrolls horizontally.
6. **Test interaction** — taps, swipes between primary tabs, and any new controls behave
   as expected, and don't fight `.app`'s `touch-action:pan-y` swipe detection.
7. **Iterate until it's visually correct**, not until it merely renders without errors.
   Fix discrepancies and re-check rather than accepting the first render.

## Reporting

If a supplied mockup conflicts with an existing pattern in `CLAUDE.md` or
`docs/design-system.md`, explain the tradeoff before implementing rather than silently
picking one.

If a visual check genuinely can't be performed in a given session (no way to run the app,
no browser access), say so explicitly rather than reporting the task as visually
complete.
