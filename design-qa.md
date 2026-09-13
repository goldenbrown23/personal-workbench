# Home visual QA

- Source visual truth: first user-attached approved Home design image in this task, reviewed together with the implementation captures in the conversation. The supplied source is a 1536 × 1024 composite rather than a standalone 402 × 874 screen.
- Implementation evidence:
  - `C:/Users/Sabic/.codex/visualizations/2026/09/11/01a0925a-0bed-7911-8293-e16bb8e1f1d8/home-final/home-390x844.png`
  - `C:/Users/Sabic/.codex/visualizations/2026/09/11/01a0925a-0bed-7911-8293-e16bb8e1f1d8/home-final/home-402x874.png`
  - `C:/Users/Sabic/.codex/visualizations/2026/09/11/01a0925a-0bed-7911-8293-e16bb8e1f1d8/home-final/home-430x932.png`
  - `C:/Users/Sabic/.codex/visualizations/2026/09/11/01a0925a-0bed-7911-8293-e16bb8e1f1d8/home-final/home-402x874-quiet.png`
- Viewports: 390 × 844, 402 × 874, and 430 × 932 CSS px at device scale factor 1.
- State: current late-night state with an actionable habit; quiet state additionally checked at 402 × 874.
- Density normalization: implementation captures are 1:1 CSS pixels. The source composite was assessed compositionally because it does not expose a standalone screen at the same density.

## Full-view comparison evidence

- The Home hero is now 330 px at 390/402 and 335 px at 430, within the requested 315–335 px band.
- Artwork is bottom-right anchored at 65% maximum width with a softened top/left mask. Copy remains in the upper-left safe area and does not collide with the illustration.
- The primary card overlaps the hero by 20 px. Its active state remains taller to preserve the existing habit action and supporting context; the quiet state measures 95.59 px.
- The requested content hierarchy is present: hero, Do This Next, A Little for Today, Habits, My Circle, affirmation, and bottom navigation.
- Summary rows measure 64 px. All Home buttons meet the 44 px minimum target, horizontal overflow is zero, and the affirmation does not collide with the fixed navigation at any tested width.

## Focused-region comparison evidence

The 402 × 874 capture is readable at 1:1 scale, so separate crops were not needed. The hero/card transition, typography, row density, artwork edge treatment, affirmation, and navigation clearance were checked directly in that capture; the quiet card was checked in its own same-size capture.

## Required fidelity surfaces

- Fonts and typography: existing project families and weights are preserved. The 34 px Home headline remains the dominant type, supporting copy wraps without clipping, and compact labels retain the existing uppercase treatment.
- Spacing and layout rhythm: 20 px Home card gutters, 20 px hero overlap, 24 px section transition, 64 px summary rows, and a 72 px affirmation create a complete first viewport without nav collision.
- Colors and tokens: existing warm card, accent, sage, peach, text, and muted tokens are retained. Only Home-specific gradients and opacity treatments changed.
- Image quality and asset fidelity: the existing evening raster remains sharp at the tested sizes and is no longer enlarged beyond 65% of the hero width. The asset does not contain the wider lamp/books room environment visible in the approved mockup, so that detail cannot be reproduced by CSS.
- Copy and content: time-of-day greeting logic and action copy remain dynamic. New Home-only labels are concise and supportive.

## Comparison history

1. Baseline: 390–405 px hero, 203.84 px primary card, one dense 86 px Habits card, missing section/Circle/affirmation hierarchy, and large dead space above navigation.
2. Pass 1: reduced/art-directed hero, compacted the active card, added the complete Home hierarchy, and replaced dashboard-like counts with visual status markers. A 4 px affirmation/navigation overlap remained at 390 px.
3. Pass 2: reduced affirmation height to 72 px and softened the artwork seam. Post-fix Playwright evidence shows zero overlap and zero horizontal overflow at all three widths.
4. Final quiet-state pass: reduced quiet card padding and icon scale. Post-fix height is 95.59 px, within the 84–96 px target.

## Remaining finding

- P3 — Asset fidelity: the existing illustration cannot reveal moon/window/lamp/books details that are absent from its canvas. A wider source illustration would be required for exact scene-level parity; current placement is the closest faithful composition without replacing artwork.

## Validation

- Playwright navigation from both Home summary rows passed.
- Browser console and page-error checks returned no errors.
- Existing Playwright suite: 2 passed.
- No source-function behavior or shared navigation styling changed.

final result: passed
