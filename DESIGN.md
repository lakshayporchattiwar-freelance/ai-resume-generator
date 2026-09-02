# DESIGN.md
## AI Resume Generator & ATS Resume Optimizer — Design System v2.0
### Codename: "Foundry" — Industrial-Grade, Human-Made Visual Language

**Status:** Canonical design reference. Every screen, component, and style decision in this application must trace back to a rule in this document. If a rule is missing for a situation, extend this document first, then implement — do not improvise ad hoc styling in code.

**Reference benchmark:** This system is modeled on the restraint and craft of Reactive Resume's dashboard (rxresu.me/dashboard/resumes) — a clean, card-grid, low-chrome dashboard with generous whitespace, a neutral base palette, one disciplined accent color, and zero decorative noise — combined with the systemic rigor of Apple's Human Interface Guidelines, Google's Material 3, and Microsoft's Fluent 2. All three of those systems share the same underlying discipline regardless of their surface differences: a strict grid, a small number of reused primitives, real (not decorative) motion, and an almost complete absence of gradient, glow, or sparkle used for its own sake.

---

## Table of Contents

1. Design Principles
2. The "Does This Look AI-Generated?" Checklist
3. Layout Contract (Fixes the Left/Right Margin Bug)
4. Color System
5. Typography
6. Spacing and Grid
7. Elevation and Surfaces
8. Iconography
9. Component Specifications
10. Motion Principles
11. Page-by-Page Application
12. Dark Mode
13. Accessibility Baseline
14. Anti-Patterns (Do Not Do This)
15. Implementation Checklist for Kilocode/GLM 5.1

---

## 1. Design Principles

**Content is the interface.** The resume a user is building is the most important object on every screen. Chrome, navigation, and decoration exist only to support that content, never to compete with it visually. If a design decision draws the eye away from the user's actual resume content or data, it is wrong, regardless of how polished it looks in isolation.

**One accent color, used sparingly.** The entire application uses exactly one accent hue for interactive/primary elements. Every other surface is neutral gray. This is the single biggest lever for looking like Apple/Google/Microsoft rather than looking like a generic AI SaaS template — those products are almost entirely grayscale with a single, disciplined accent used only where it means something (a primary action, a selected state, a live status).

**Real hierarchy through size, weight, and space — not color or effects.** Hierarchy is established primarily through typographic scale and whitespace, exactly as Apple and Google's writing-heavy interfaces do. Color, shadow, and motion are reserved as secondary reinforcement, not the primary hierarchy mechanism.

**Restraint is the craft.** Every effect included in the previous redesign passes (glassmorphism, glow, sparkle icons, gradient text, 3D tilt) is not banned outright, but each one is now gated behind a strict "does this serve a specific, named function" test (Section 2 and Section 14). The previous passes over-applied effects broadly, which reads as generated rather than designed. This version cuts usage by roughly 80% and applies what remains with surgical precision.

**Consistency over novelty.** There are exactly one button system, one card system, one input system, one spacing scale, and one elevation scale used everywhere in the app. No screen invents its own one-off pattern. This is what makes Apple/Google/Microsoft products feel authored by one team rather than assembled from templates.

---

## 2. The "Does This Look AI-Generated?" Checklist

Before shipping any screen, check it against every item below. If any box is true, the screen needs another pass.

The screen uses a purple-to-blue (or blue-to-pink, or blue-to-violet) gradient anywhere other than the single, specifically-approved hero accent moment defined in Section 11. Generic purple/blue/pink gradients are the single most recognizable "AI startup template" tell of 2024–2026 and are banned everywhere else in this app.

The screen uses a sparkle/star icon (✨) attached to more than one button on the same screen. Sparkle icons are reserved exclusively for the single, most important AI action per screen (defined per-screen in Section 11), never sprinkled onto every button that happens to involve AI.

The screen has visible empty gutters/margins on the left and right of the viewport that don't match the layout contract in Section 3 — meaning content is centered in a narrow column with large, unexplained dead space on both sides at common desktop widths, rather than using the full defined container width. This is the specific GLM 5.1 authoring bug reported and must be checked on every screen at 1280px, 1440px, and 1920px viewport widths.

The screen has more than two font weights visible in a single view, or uses a decorative/display font anywhere other than the single approved hero moment. Apple, Google, and Microsoft interfaces are typographically quiet: one typeface family, two or three weights in active use per screen, full stop.

The screen has drop shadows on more than roughly a third of visible elements simultaneously, or has glow effects on more than one element in the same viewport. Real products use elevation sparingly, reserving heavier shadow/glow for the single element that is currently active, floating, or being dragged.

The screen's copy uses more than one exclamation point, or uses hype language ("Supercharge," "Unleash," "Revolutionize," "Instantly," stacked adjectives) in the same viewport. Apple/Google/Microsoft product copy is calm, factual, and short.

Any icon in the screen is a generic, oversized, centered line-icon sitting alone in a large soft-tinted rounded square with no surrounding context — this specific pattern (common in AI-generated empty states and feature cards) is allowed exactly once per screen at most, never repeated three times in a row as a row of "feature cards," which is the number one visual cliché to avoid per Section 14.

---

## 3. Layout Contract (Fixes the Left/Right Margin Bug)

This section exists specifically because GLM 5.1 has been observed introducing unwanted, inconsistent left/right margins that make the app look like it's floating in a narrow column rather than using the viewport properly, the way real Apple/Google/Microsoft product pages do (which typically run edge-to-edge for backgrounds/dividers while constraining only the content itself to a readable measure).

**The rule, precisely:** every page has exactly one root layout wrapper, `<div class="page-shell">`, which is `width: 100%` with no `max-width` and no side margin/padding of its own — this is what allows headers, background treatments, and full-bleed dividers to run edge-to-edge. Inside that shell, every piece of actual content (nav bar contents, page headings, cards, forms) sits inside a `<div class="content-container">` defined as `max-width: 1280px; margin-inline: auto; padding-inline: 24px;` on screens ≥1024px, and `padding-inline: 16px` on screens <768px, with no additional nested max-width or centering applied anywhere else in the component tree. No component is permitted to declare its own `max-width`, `margin: 0 auto`, or fixed `width` percentage that would create a second, competing centering context nested inside `.content-container` — this exact anti-pattern (a card or section centering itself again inside an already-centered container) is what produces the large, inconsistent dead margins seen in the reported bug. The header and footer use `.page-shell` directly (full width, no side padding of their own beyond what `.content-container` provides for their inner content), so their background color/blur extends fully to both viewport edges while their logo/nav/button content aligns to the same 1280px measure as the page body beneath them — this is exactly how apple.com, google.com, and microsoft.com headers behave (full-bleed bar, content-width contents). Every button, input, and interactive element must render with its natural size and required padding only, per its component spec in Section 9, and must never be wrapped in a container that adds unexplained extra horizontal margin around it — if a button appears to have large empty space to its left or right beyond its own defined padding, that is a bug, not a stylistic choice, and must be fixed by removing the offending wrapper margin, not by resizing the button.

**Concrete numeric spec:**

| Breakpoint | `.page-shell` | `.content-container` max-width | `.content-container` side padding |
|---|---|---|---|
| ≥1440px | 100vw | 1280px | 24px (effectively centers with wide gutter, but gutter is a byproduct of centering a fixed max-width, not an applied margin) |
| 1024–1439px | 100vw | 1280px (or 100% if viewport <1280px) | 24px |
| 768–1023px | 100vw | 100% | 24px |
| <768px | 100vw | 100% | 16px |

Any component library default (for example, a UI kit's `Container` component) that applies its own conflicting max-width or padding must have those defaults overridden to match this table exactly, application-wide, in one central layout component — never patched per-page.

---

## 4. Color System

The palette is neutral-first with exactly one accent. No secondary/tertiary decorative colors are used except for the minimum required semantic set (success, warning, error) and data-visualization needs (score bands).

### 4.1 Neutral Scale (used for 95%+ of all surface, text, and border color in the app)

| Token | Light Mode Hex | Usage |
|---|---|---|
| `neutral-0` | `#FFFFFF` | Page background, primary card surface |
| `neutral-50` | `#FAFAFA` | Subtle section background, alternating rows |
| `neutral-100` | `#F4F4F5` | Secondary surface, input background (disabled) |
| `neutral-200` | `#E4E4E7` | Default borders, dividers |
| `neutral-300` | `#D4D4D8` | Stronger borders, disabled input border |
| `neutral-400` | `#A1A1AA` | Placeholder text, disabled text |
| `neutral-500` | `#71717A` | Secondary/muted body text |
| `neutral-600` | `#52525B` | Secondary headings, icon default color |
| `neutral-700` | `#3F3F46` | Body text |
| `neutral-800` | `#27272A` | Primary headings |
| `neutral-900` | `#18181B` | Highest-emphasis text, primary button label on light accent |
| `neutral-950` | `#09090B` | Reserved for dark-mode base background only |

### 4.2 Accent (the only chromatic color used for interactive/brand elements)

| Token | Hex | Usage |
|---|---|---|
| `accent-600` | `#2563EB` | Primary button background, active nav indicator, focus ring, links, selected states |
| `accent-700` | `#1D4ED8` | Primary button hover/pressed |
| `accent-100` | `#DBEAFE` | Accent-tinted background (selected card, active tab background) |
| `accent-50` | `#EFF6FF` | Faintest accent tint, used only for subtle selected-row backgrounds |

This single blue is deliberately restrained and close to Apple/Microsoft's own system-accent blues rather than a saturated "AI purple." No gradient is built from this color for general UI; see Section 11 for the one approved exception.

### 4.3 Semantic Colors (status only — never decorative)

| Token | Hex | Usage |
|---|---|---|
| `success-600` | `#16A34A` | Success text/icon, "Saved" indicator, high ATS score band |
| `success-100` | `#DCFCE7` | Success tinted background |
| `warning-600` | `#D97706` | Warning text/icon, medium ATS score band |
| `warning-100` | `#FEF3C7` | Warning tinted background |
| `error-600` | `#DC2626` | Error text/icon/border, low ATS score band |
| `error-100` | `#FEE2E2` | Error tinted background |

### 4.4 Score-Band Mapping (for ATS Score and any percentage-based indicator)

0–49 uses `error-600`/`error-100`; 50–74 uses `warning-600`/`warning-100`; 75–100 uses `success-600`/`success-100`. This replaces any prior arbitrary gradient-based score ring coloring with a clear, semantic, three-band system a user can learn once and trust everywhere.

---

## 5. Typography

**Typeface:** Inter, single family, for both UI and body content — no secondary display/decorative font anywhere in the standard UI (the one exception in Section 11's hero moment uses Inter as well, just at larger scale and tighter tracking, not a different font).

| Token | Size / Line-height | Weight | Tracking | Usage |
|---|---|---|---|---|
| `display` | 40px / 48px | 600 | -0.02em | Landing hero headline only — the single largest text in the app |
| `heading-xl` | 28px / 36px | 600 | -0.01em | Page titles (Resume Builder section title, "Job Description", "ATS Score") |
| `heading-lg` | 22px / 30px | 600 | -0.01em | Card/section titles within a page |
| `heading-md` | 17px / 24px | 600 | 0 | Subsection titles, modal titles |
| `body-lg` | 16px / 24px | 400 | 0 | Primary body copy, form field values |
| `body-md` | 14px / 20px | 400 | 0 | Secondary body copy, helper text, table cells |
| `label` | 13px / 16px | 500 | 0 | Form labels, nav items, button labels |
| `caption` | 12px / 16px | 500 | 0.01em | Metadata, timestamps, badge text |

Only two weights are used across the entire type scale — 400 (regular) and 600 (semibold) — with 500 (medium) reserved specifically for labels/buttons/nav to give interactive text a distinct but still restrained weight. Bold (700) and black (800/900) are not used anywhere; this alone removes most of the "loud" feeling of AI-generated interfaces, which tend to overuse heavy weights for emphasis.

---

## 6. Spacing and Grid

An 8px base unit governs all spacing: 4, 8, 12, 16, 24, 32, 48, 64, 96px are the only spacing values used anywhere in the app (4 and 12 are permitted only for tight internal component spacing like icon-to-label gaps; page-level and section-level spacing uses only 16/24/32/48/64/96). Card internal padding is 24px on desktop, 16px on mobile, applied uniformly to every card in the app — there is exactly one padding value per breakpoint for cards, not a different value per card type. Vertical rhythm between major page sections is 64px on desktop, 48px on mobile; vertical rhythm between related elements within a section (a heading and its subtext, a label and its input) is 8px; vertical rhythm between unrelated stacked components within the same section is 24px.

---

## 7. Elevation and Surfaces

Three elevation levels only, replacing the four-to-five-tier system from the prior effects pass, in keeping with this version's restraint principle:

**Level 0 (resting, the default for nearly everything):** no shadow, separation achieved via a 1px `neutral-200` border only. This is the default state for cards, inputs, and list rows — matching how Reactive Resume, Notion, and Linear render the vast majority of their surfaces with borders rather than shadows.

**Level 1 (raised — hover state on interactive cards, dropdown menus):** `box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)`, no border change needed since the shadow alone communicates lift.

**Level 2 (floating — modals, popovers, the currently-dragged item):** `box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.10)`, reserved for truly overlaid content only.

Border radius: 8px for buttons, inputs, and small controls; 12px for cards and modals; 999px (full pill) reserved exclusively for status badges and the single AI-action button defined per screen in Section 11 — not for every button that happens to touch AI functionality, correcting the prior over-application of pill shapes.

---

## 8. Iconography

Use a single, consistent line-icon set at 20px (inline, e.g., in buttons/labels) or 24px (standalone, e.g., empty states) with a consistent 1.5px stroke weight — Lucide icons (already available in this stack) satisfy this directly. Icons are always `neutral-600` by default, switching to `accent-600` only when representing an active/selected state or living inside a primary button. Icons are never given their own colored gradient fill, drop shadow, or standalone colored background box except in the one specific empty-state pattern permitted once per screen per Section 2.

---

## 9. Component Specifications

**Buttons — Primary:** height 40px (compact contexts) or 44px (primary page actions), horizontal padding 16px, `accent-600` background, white label text at `label` scale/weight 500, 8px radius, no shadow at rest, Level 1 shadow plus `accent-700` background on hover, no scale/transform animation on hover (a same-position color/shadow change only — the prior pass's 1.02–1.03 hover-scale on every button is removed; reserved instead for the one hero CTA only, per Section 11).

**Buttons — Secondary:** height matches primary, `neutral-0` background, 1px `neutral-300` border, `neutral-800` label, hover switches border to `neutral-400` and background to `neutral-50`, no shadow at any state.

**Buttons — Ghost/Tertiary:** no background, no border, `neutral-700` label, hover adds `neutral-100` background only.

**Buttons — AI Action (used once per screen, maximum):** same 40/44px height, pill radius (999px), `accent-600` background (solid, not gradient), single small icon (Lucide `sparkles`, 16px) leading the label, otherwise identical behavior to primary buttons — this is the only button in the app permitted the pill shape and the icon, precisely to keep it meaningful as a signal ("this specific action invokes AI") rather than decorative.

**Inputs:** height 44px (single-line), `neutral-0` background, 1px `neutral-300` border, 8px radius, 12px horizontal padding, `body-lg` value text, `neutral-400` placeholder, label in `label` scale positioned 8px above the field. Focus state: border becomes `accent-600` (1.5px), plus a 3px `accent-100`-colored outer ring (`box-shadow: 0 0 0 3px #DBEAFE`) — a materially smaller, calmer glow than the prior spec's 4px/10%-opacity glow, matching how restrained Apple/Google form focus rings actually look. Error state: border becomes `error-600`, helper text below in `error-600` at `body-md` — and, per the prior QA fix, this state only ever appears after the field has been touched/blurred with invalid content, never on initial mount.

**Cards:** `neutral-0` background, Level 0 elevation (border only) at rest, 12px radius, 24px padding. Interactive cards (template selector, clickable list items) move to Level 1 on hover with no scale transform, no tilt, no cursor-follow glow — the prior pass's 3D tilt/cursor-glow effect is removed entirely from default cards and reserved, at most, for a single hero illustration element per Section 11, never applied to functional UI cards a user needs to read and click accurately.

**Navigation (header):** `.page-shell`-width bar, `neutral-0` background at `opacity: 1` with a 1px `neutral-200` bottom border (the prior heavy blurred-glass header is replaced with a plain, solid, confident bar — exactly like Apple/Google/Microsoft product headers, which are almost never translucent-blurred in their primary product UI, only in marketing/OS-chrome contexts). Nav items use `label` scale, `neutral-600` default, `neutral-900` + a 2px `accent-600` bottom underline (not a filled pill background) for the active item, with 32px horizontal gaps between items as already corrected in the prior QA pass.

**Sidebar (Resume Builder section nav):** `neutral-50` background, 1px `neutral-200` right border, each item 44px tall with 12px horizontal padding, 8px radius on hover/active background (`neutral-100` hover, `accent-50` active with `accent-600` left-edge 2px indicator bar), icon plus label plus optional trailing status (checkmark in `success-600`, or a small `Req` badge in `error-100`/`error-600` pill).

**Badges:** 4px vertical / 8px horizontal padding, `caption` scale, pill radius, background/text pair drawn from the semantic or neutral tables above only — never a custom one-off badge color.

**Progress/Score Ring:** 8px stroke width (reduced from the prior 6px spec for better legibility at small sizes), color drawn from the Section 4.4 score-band mapping, track color `neutral-200`, center numeral in `heading-xl` scale.

---

## 10. Motion Principles

Motion in this version exists to clarify state changes, not to entertain. Standard transition duration is 150ms for hover/focus state changes (color, border, background) and 200ms for layout changes (accordion expand, panel open), both using `ease-out`. Page transitions are a simple 150ms opacity fade only — the prior 8–16px slide-plus-fade is removed as unnecessary flourish for routine navigation. Entrance stagger for lists (builder sections, keyword badges) is reduced to a maximum of 3–5 visible stagger steps at 30ms apart, then remaining items appear together, avoiding the "everything cascades in one at a time for two full seconds" feeling that reads as an AI-generated demo reel rather than a tool people use all day. Count-up animation on the ATS Score remains (it serves the specific function of signaling "this was computed live") but is shortened to 500–600ms. Skeleton loading shimmer remains for genuinely async operations (parsing, AI generation, export) exactly as previously specified — this is functional, not decorative, motion and is retained as-is. All other previously-specified decorative motion — kinetic word-by-word headline reveals, animated gradient text, ambient background glow fields, film-grain noise overlays, scroll-parallax on illustrations, cursor-follow card tilt/glow — is removed from the default component set entirely and survives only inside the single, deliberately-scoped hero moment described in Section 11.

---

## 11. Page-by-Page Application

**Landing Page.** Header per Section 9. Hero: `display`-scale headline in `neutral-900`, with exactly one word or short phrase (for example, "powered by AI") rendered in `accent-600` solid color — no gradient, no animation on the text itself. This is the one screen permitted a single, restrained illustrative element (the resume-preview mockup with the ATS score callout) which may keep a very subtle, slow (8s+) parallax-on-scroll of a few pixels, and nothing else animated within it. One primary button ("Create Resume," solid `accent-600`, this is also the one place in the whole app the primary button may use a slightly larger hover lift of 1px translate-Y plus Level 1 shadow, since it is the single most important conversion action on the site) and one secondary button ("Upload Existing"). Below the fold: a "Precision Tools for Professionals" section with exactly three cards, each using the single-icon-in-tinted-square pattern once, Level 0 at rest; a "How It Works" four-step row using numerals instead of a repeated icon-in-box pattern (numerals in `heading-lg` scale inside a plain `neutral-100` circle, avoiding the repetition flagged in Section 2's checklist); a plain, solid `neutral-50` footer with standard link list, no glass, no floating elements overlapping it.

**Resume Builder.** Sidebar per Section 9. Every form section uses the card and input specs in Section 9 uniformly — Contact Info, Summary, Experience, Education, Projects, Skills, Certifications, Achievements, References all share identical field styling, spacing, and card treatment with zero per-section deviation (directly fixing the previously reported inconsistency where only some sections received styling). The "Improve with AI" trigger on Summary/Experience/Project/Achievement fields is the AI Action button variant from Section 9, used consistently, never duplicated as multiple sparkle buttons stacked in one section.

**Job Description Input.** Tab toggle (Paste Text / Upload File) uses a segmented-control pattern: `neutral-100` track background, active tab `neutral-0` background with Level 0 border and `neutral-900` text, inactive tab transparent with `neutral-500` text — directly fixing the previously ambiguous tab state. "Analyze Job Description" is the AI Action button; "Skip for Now" is a Ghost button, with a firm 16px gap between them and full container-edge padding per Section 3.

**Analysis / ATS Score.** Score ring per Section 9/4.4. Recommendations and keyword lists use plain Level-0 list rows (a 1px divider between rows, not individually shadowed cards each), reducing the "everything is a floating card" repetition that reads as templated.

**Preview & Export.** Resume canvas sits in a single Level-1 card (it is the one place elevated-by-default styling is justified, since it represents a physical document). Export panel fields (template selector, format toggle) use standard component specs with no unique treatment.

---

## 12. Dark Mode

Dark mode is a first-class, not an afterthought, consistent with the reference benchmark. Background uses `neutral-950` (`#09090B`), primary surface (cards, inputs) uses a slightly lifted `#141417`, borders use a low-contrast `#26262B`, primary body text uses `#E4E4E7` (never pure white, per standard dark-mode legibility practice), and the single accent blue shifts slightly lighter to `#3B82F6` for sufficient contrast against the dark background while remaining recognizably the same brand blue. Elevation in dark mode is communicated primarily through background-lightness steps (surface slightly lighter than page background) rather than shadow, since shadows barely register on dark backgrounds — shadows are retained only for true floating/modal contexts at reduced opacity.

---

## 13. Accessibility Baseline

All text/background pairs meet WCAG AA contrast minimums (4.5:1 for body text, 3:1 for large text ≥24px/600-weight). Every interactive element has a visible focus state (the accent focus ring from Section 9), reachable and operable via keyboard alone. All motion defined in Section 10 respects `prefers-reduced-motion`, reducing to instant/no-transition states when set. Color is never the sole indicator of state or meaning — every score band, badge, and validation state pairs color with an icon and/or text label.

---

## 14. Anti-Patterns (Do Not Do This)

Do not use more than one gradient anywhere outside the single approved hero accent word. Do not stack three or more feature cards that each use the identical icon-in-tinted-square-plus-heading-plus-paragraph layout as the only content on a section — vary the presentation (numerals, a shared connecting line, asymmetric sizing) so it doesn't read as generated filler. Do not apply hover scale-transforms to routine buttons and cards throughout the app — reserve any scale-on-hover for the single landing-page primary CTA only. Do not use blurred/translucent glass surfaces for the primary application header or for any surface a user reads text on for extended periods — reserve translucency, if used at all, for very brief transient overlays only. Do not add a sparkle icon to more than one button per screen. Do not use drop shadows on more than roughly a third of visible elements in a single viewport at once. Do not leave any card, section, or button centered inside its own independent max-width/margin wrapper nested inside the already-centered `.content-container` — this is the specific root cause of the reported left/right margin bug and must be actively checked for in code review, not just visually. Do not introduce a second typeface, a bold/black weight, or all-caps large headings anywhere in the app.

---

## 15. Implementation Checklist for Kilocode/GLM 5.1

Before marking any screen complete, confirm all of the following: the page root uses `.page-shell` + `.content-container` exactly as defined in Section 3 with no nested competing max-width/margin anywhere in that page's component tree; all colors used trace to a named token in Section 4, with zero raw hex values written inline in component code; all text uses a token from Section 5's scale, with no ad hoc font-size/weight values; all spacing uses a value from Section 6's approved list, with no arbitrary pixel spacing; every button, input, and card matches its exact specification in Section 9 with no per-screen deviation; motion durations and effects match Section 10, with any previously-implemented decorative effect not explicitly retained in Section 11 removed; the screen has been checked against every item in Section 2's checklist and against every item in Section 14's anti-pattern list; and the screen has been visually verified at 375px, 768px, 1280px, 1440px, and 1920px viewport widths with specific attention to whether any unexplained left/right dead space appears at the wider breakpoints.

---

*End of DESIGN.md v2.0 ("Foundry"). This document supersedes the prior "Precision Intelligence" token set and all prior standalone glassmorphism/effects prompts — implement strictly from this file going forward.*
