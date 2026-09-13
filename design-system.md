# Personal Workbench — Approved UI Primitives

This is the concise implementation reference for future UI work. It records the design
language approved on the Tailwind Home hero in `index.html` and `styles.css`. Reuse these
primitives before introducing new values. New screens may use different compositions,
but they should feel unmistakably part of Personal Workbench.

## 1. Page geometry

The mobile page edge is `16px`. The Home implementation achieves this through the
existing app padding plus `tw:mx-0.5`; future components should target the resulting
edge, not copy that implementation detail when a simpler utility works.

Use this spacing rhythm:

| Role | Value | Typical use |
|---|---:|---|
| Micro | `4px` | label details, tiny visual separation |
| Tight | `8px` | related text, icon-to-label, compact controls |
| Transition | `10px` | approved hero-to-primary-action overlap |
| Content | `12px` | normal internal or sibling-content gap |
| Page edge | `16px` | mobile horizontal inset |
| Section / hero padding | `20px` | section separation and hero inset |

The approved Home hero is fluid rather than proportionally enlarged:

| Viewport | Hero width | Hero height | Text column | Illustration width |
|---:|---:|---:|---:|---:|
| `390px` | `358px` | `220px` | `190.8px` (`60%` of inner width) | `112px` |
| `402px` | `370px` | `220px` | `198px` (`60%` of inner width) | `112px` |
| `430px` | `398px` | `228px` | `214.8px` (`60%` of inner width) | `120px` |

Keep the `16px` edge and `20px` internal padding stable across these widths. Prefer
fluid width plus one small breakpoint adjustment over separate compositions for every
phone size. Responsive changes should preserve hierarchy, whitespace, and focal balance;
they should not merely scale every element together.

## 2. Surface system

| Surface | Radius | Role |
|---|---:|---|
| Hero / expressive surface | `28px` | the screen's primary emotional orientation |
| Large nested or action surface | `20px` | a distinct task or content group related to the hero |
| Control / icon container | `12px` baseline | buttons, inputs, and compact controls; existing Home controls may use `13–14px` where already established |

Primary surfaces establish context and receive the strongest composition and whitespace.
Secondary surfaces hold concrete content or action and should be quieter, smaller, and
clearly bounded. On Home, the action surface overlaps the hero by only `10px`: related,
but visibly separate. Nested surfaces do not compete with their parent through stronger
shadows, color, scale, or radius.

## 3. Typography

Use the system font stack for interface copy. Weight and spacing establish hierarchy
without making the interface loud.

| Role | Approved treatment |
|---|---|
| Eyebrow / meta | `13px`, `600`, `16px` line-height, uppercase, `0.04em` tracking |
| Hero title | `26px`, `600`, `1.08` line-height, `-0.02em` tracking |
| Supporting copy | `14px`, regular, `20px` line-height |
| Action eyebrow | `11px`, `820`, uppercase, `0.055em` tracking |
| Action title | `16px`, `760`, `1.3` line-height, `-0.01em` tracking |
| Secondary / helper copy | `12px`, `var(--muted)`, `1.4` line-height |
| Emotional accent | `14px`, italic, `1.2` line-height, right-aligned; `"Bradley Hand", "Segoe Print", cursive` |

The emotional accent supports the message; it never replaces the primary title or action
label. Keep it brief, visually quiet, and clear of functional copy.

## 4. Hero principles

A Personal Workbench hero is a role in the hierarchy, not one rigid layout.

- Keep it compact enough that useful content appears in the first viewport.
- Establish one clear primary message before supporting copy or decoration.
- Treat illustration as ambience: preserve its aspect ratio, anchor it intentionally,
  and never let it dominate or push content unpredictably.
- Keep emotional or supportive copy secondary to the primary message.
- Use intentional whitespace to make the screen feel calm, not empty.
- Give the hero an immediate visual relationship to the page's primary action without
  merging the two surfaces.
- Avoid dashboard density, competing metrics, or several equal-weight actions.
- Art-direct imagery by breakpoint when needed; crop, mask, and focal position serve the
  composition rather than mathematical scaling.

## 5. Action principles

The approved Home sequence is:

**orientation → reassurance → one concrete next action**

This is a UX principle, not a requirement that every tab contain a literal “Do This
Next” module. Each screen should reduce uncertainty, provide calm context, and make its
most useful next step obvious. Do not present multiple actions at equal visual weight.
Interactive targets remain at least `44px` tall.

## 6. Tailwind conventions

- Tailwind utilities use the required `tw:` prefix and run without Preflight.
- Use Tailwind for deterministic layout, spacing, dimensions, positioning, typography
  geometry, radius, and responsive behavior.
- Keep semantic classes for JavaScript selectors, component identity, period/state
  styling, artwork masks, colors, and behavior.
- Prefer the approved scale: `tw:p-5`, `tw:right-5`, `tw:w-28`, `tw:w-3/5`,
  `tw:text-sm`, and corresponding standard utilities.
- Arbitrary values are acceptable only when they encode an approved primitive that the
  default scale cannot express clearly, such as `tw:rounded-[28px]`,
  `tw:text-[26px]`, `tw:leading-[1.08]`, or `tw:-mt-[10px]`.
- Do not use arbitrary values for trial-and-error nudges. Measure the rendered geometry
  first and choose from this system whenever possible.
- Use responsive variants for small, intentional art-direction changes. Avoid broad
  breakpoint redesigns when fluid behavior is sufficient.
- Use Tailwind's `!` modifier only as a narrow bridge where an approved utility must
  override existing unlayered legacy CSS; do not make it the default.
- Do not duplicate the same property in Tailwind and legacy CSS. Remove only rules proven
  obsolete and local to the migrated component.

## 7. AI implementation rule

Future Codex changes must inspect and reuse these primitives before inventing spacing,
radius, typography, surface, or responsive values. Start with the nearest approved
component and preserve its hierarchy. A genuinely new value requires a demonstrated
visual need, rendered validation, and an update to this reference if it becomes a
reusable product pattern.

The rendered interface is the source of truth. Validate UI changes at `390px`, `402px`,
and `430px` before considering mobile work complete, while preserving application logic,
state, navigation, and accessibility behavior.
