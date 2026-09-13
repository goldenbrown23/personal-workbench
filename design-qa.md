# Home artwork-slot design QA

- Source visual truth: the unchanged current Habits hero for component geometry and
  equivalent visual weight.
- Implementation under review: Home only, with its existing time-based artwork, copy,
  colors, action logic, and hero dimensions preserved.
- Side-by-side evidence:
  - `C:/Users/Sabic/.codex/visualizations/2026/09/11/01a0925a-0bed-7911-8293-e16bb8e1f1d8/home-habits-slot-final/comparison-390.png`
  - `C:/Users/Sabic/.codex/visualizations/2026/09/11/01a0925a-0bed-7911-8293-e16bb8e1f1d8/home-habits-slot-final/comparison-402.png`
  - `C:/Users/Sabic/.codex/visualizations/2026/09/11/01a0925a-0bed-7911-8293-e16bb8e1f1d8/home-habits-slot-final/comparison-430.png`
- Period evidence: the `periods` subfolder contains morning, afternoon, and evening
  captures plus a three-period montage at each requested width.
- Capture setup: CSS widths `390`, `402`, and `430px`, common `874px` height, device
  scale factor 1, reduced motion, service workers blocked for deterministic local QA.

## Geometry and composition

- Home and Habits have identical outer bounds: `16px` page edge, `y=18px`, `220px`
  height at 390/402 and `228px` at 430, `28px` radius, and `20px` internal inset.
- Both copy columns begin at `x=36px`, `y=38px` and use `60%` of the usable inner
  width. The approved Home text and handwritten accent positions are unchanged.
- Home now uses a wide lower-right visual slot: `260 × 124px` at 390/402 and
  `280 × 134px` at 430. The slot matches the lower-right zone occupied by Habits while
  allowing the narrower Home bitmap to keep its natural aspect ratio.
- The Home bitmap is `160px` wide at 390/402 and `170px` at 430, bottom/right aligned
  with the hero. It is neither stretched nor cover-zoomed.
- A two-axis mask fades the artwork gradually from its top and left edges. No raw bitmap
  edge or horizontal overflow is visible in the requested period/width captures.
- “Do This Next” begins exactly `12px` after the hero bottom at every requested width;
  there is no overlap.

## Source-art limitation

The Home files are compact near-square scenes (`320×260`, `305×260`, and `350×260`),
whereas the Habits asset is an ultra-wide environmental banner. The wrapper and fade can
match the component slot and visual weight, but they cannot add the books, plants, or
negative-space environment absent from Home's source. Increasing the Home bitmap further
would recreate the oversized-character problem, so this pass intentionally does not use
raw bitmap dimensions as the matching criterion.

## Findings and validation

- No actionable P0, P1, or P2 visual differences remain within this task's scope.
- P3 — Home necessarily contains less environmental context than Habits because of its
  source aspect ratio; this is an asset limitation, not a CSS geometry defect.
- Morning, afternoon, and evening retain natural aspect ratios and remain bottom-right
  anchored at all three widths.
- No horizontal overflow, clipped hero copy, bottom-navigation collision, console error,
  or page error was observed.
- Production build completed successfully.
- Existing Playwright suite: 2 passed.

final result: passed
