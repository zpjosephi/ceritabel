---
name: ceritabel
description: A dark, themeable data-dashboard that turns a CSV into a correct, plain-language EDA
colors:
  background: "#08080d"
  surface: "#111119"
  surface-2: "#181822"
  surface-3: "#20202c"
  border: "#26262f"
  border-strong: "#34343f"
  chart-grid: "#2a2a38"
  foreground: "#f0f0f5"
  muted: "#9a9aab"
  muted-strong: "#b8b8c6"
  accent-amber: "#e0a44a"
  accent-amber-strong: "#f2bd6b"
  accent-amber-ink: "#20160a"
  accent-teal: "#22c0ad"
  accent-coral: "#f2603f"
  accent-lime: "#b5e048"
  accent-hazard: "#d62a23"
  positive: "#34d399"
  negative: "#fb7185"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
  data:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
    fontFeature: "tnum"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent-amber}"
    textColor: "{colors.accent-amber-ink}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.accent-amber-strong}"
    textColor: "{colors.accent-amber-ink}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "20px"
  stat:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  tab-active:
    backgroundColor: "{colors.accent-amber}"
    textColor: "{colors.accent-amber-strong}"
    rounded: "{rounded.lg}"
    padding: "8px 14px"
---

# Design System: ceritabel

## 1. Overview

**Creative North Star: "The Calibrated Instrument"**

ceritabel looks and behaves like a precision instrument you trust because it
reads true. The whole surface is a dark, low-noise canvas — a deep tinted
near-black (#08080d) with a barely-there film grain — so the only things that
glow are the data and the single accent. Nothing here is decorative for its own
sake: the graph-paper grid behind the hero is plotting space, the tabular
numerics are a readout, the diverging heatmap is a measurement. The aesthetic
says *the numbers are real* before a single word is read.

The personality is **sharp, modern, confident** — a contemporary analyst's tool,
fast and self-assured without ever being loud. Depth comes from tonal layering
(four stepped surface greys) and tinted shadows that carry the canvas hue plus a
faint accent cast, never pure black. A single accent — **aviation-hazard red by
default**, swappable to amber, teal, coral, or lime at runtime — carries every
action, selection, and state indicator. Its rarity is the point: when something is
accent-colored, it means something. The hazard-red default is a deliberate echo of
the author's portfolio (an aviation/blueprint instrument identity), so the two
sites read as one hand.

This system explicitly rejects the **hype-y AI startup** look (no glowing "magic"
gradients, no sci-fi chrome, no purple mysticism — hype undermines the trust
premise), the **generic SaaS template** (no cream/indigo, no identical
feature-card grids, no tracked-uppercase eyebrow on every section), **enterprise
BI bloat** (no toolbar clutter or dropdown soup), and anything **childish**
(no bouncy/elastic motion, no emoji-soup gamification of a tool about correctness).

**Key Characteristics:**
- Dark-by-default, single-accent, tonally layered.
- Data-native visual language (graph-paper grids, tabular figures, diverging scales).
- Restraint as confidence: glow is rationed, motion conveys state.
- Themeable accent without touching the structural greys.

## 2. Colors

A near-monochrome dark field with one rationed accent, plus two reserved
semantic signals. Color carries meaning, never decoration.

### Primary
- **Hazard Red** (#d62a23, strong #ff5d54): **the default accent** and the brand's
  through-line to the author's aviation/blueprint portfolio. Carries primary
  actions (CTA, the brand wordmark's "bel", the favicon), the current
  tab/selection, active states, and data emphasis. **Ink #ffffff** — being a
  saturated red, its readable on-fill text is white, not the near-black the lighter
  accents use. Verified: white on #d62a23 ≈ 5:1, strong #ff5d54 on canvas ≈ 6.6:1.
- **Alternate accents** (swappable at runtime via `html[data-accent]`): **Amber**
  (#e0a44a, the original warm accent, dark ink #20160a), **Teal** (#22c0ad),
  **Coral** (#f2603f), **Lime** (#b5e048). Each ships its own `-strong`, `-ink`,
  `-soft`, and `-glow` quartet so contrast holds across all five.

### Neutral
- **Canvas** (#08080d): the deep tinted near-black body background.
- **Surface ramp** (#111119 → #181822 → #20202c): three stepped greys for
  cards, nested surfaces / table headers, and hover / raised nested states.
  Depth is built by stacking these, not by heavy shadow.
- **Borders** (#26262f hairline, #34343f emphasized/hover): structure drawn with
  hairlines, not boxes.
- **Chart Grid** (#2a2a38): the dedicated gridline / axis stroke inside Recharts
  and the custom heatmap. A hair brighter than the resting border so plot
  reference lines read without competing with the data.
- **Ink ramp** (#f0f0f5 foreground, #b8b8c6 muted-strong labels, #9a9aab muted
  secondary): three text weights. `muted` is the floor — it must clear 4.5:1 on
  any surface it lands on; never go lighter for "elegance."

### Tertiary (semantic — reserved, never decorative)
- **Positive** (#34d399): good-news stats, the privacy/shield reassurance, a
  healthy data-quality score (≥80).
- **Warning** (#fbbf24, strong #fcd34d): medium-severity data-quality issues and
  a mid score (50–79). A *fixed* semantic hue, independent of the themeable
  accent, so caution always reads the same regardless of the active accent.
- **Negative** (#fb7185): errors, destructive/parse failures, a poor score (<50).

### Named Rules
**The One Accent Rule.** Exactly one accent hue is live at a time, and it stays
under ~10% of any screen's surface. Two accents on one screen means one is wrong.

**The Semantic-Only Signal Rule.** Positive-green, warning-amber, and
negative-rose are reserved for meaning (success / caution / error, good–bad
delta). They are forbidden as decoration. Three severities map to three colors:
warn ≠ danger — caution is amber, failure is rose.

## 3. Typography

**Display / Body Font:** Geist (with system-ui, sans-serif)
**Data / Mono Font:** Geist Mono (with ui-monospace, monospace)

**Character:** One precise, contemporary grotesque carries everything — headings,
labels, body, buttons — for product calm and consistency; Geist Mono is reserved
for numbers, so every figure reads as a measured readout, not prose.

### Hierarchy
- **Display** (700, clamp(2.25rem → 3.75rem), 1.05, -0.03em): landing-page hero
  H1 only. `text-balance` on. Ceiling is ~3.75rem — the page states, it doesn't shout.
- **Headline** (600, 1.875rem / `text-3xl`, -0.02em): marketing section H2s.
- **Title** (600, 1rem / `text-base`–`text-lg`, -0.01em): card and section
  headings inside the app (`SectionTitle`), feature-row titles.
- **Body** (400, 1rem, 1.6): prose and descriptions. Capped at 65–75ch
  (`max-w-md` / `max-w-2xl`). `text-pretty` on long runs.
- **Label** (500, 0.75rem / `text-xs`, 0.04em): metadata, hints, the *one*
  deliberate uppercase tracked label (the variable-selector section). Used
  sparingly — not as a per-section eyebrow.
- **Data** (Geist Mono, 600, tabular-nums via `.tnum`): every stat value, table
  figure, and axis number. Tabular figures so columns of numbers align.
- **Telemetry label** (Geist Mono, ~11px, uppercase, +0.12em tracking via
  `.tele`): instrument-style labels on data fields and readouts (Stat labels, the
  variable-scope control, the preview metadata tag). A borrowed signature from the
  author's portfolio. **Not** a per-section eyebrow — that's still banned; `.tele`
  labels a *field*, never decorates a heading.

### Named Rules
**The Readout Rule.** Any standalone number a user might compare or scan — stat
values, table cells, axis ticks — uses `.tnum` tabular figures. Numbers are the
product; they line up like an instrument readout.

**The Fixed-Scale-In-App Rule.** Fluid `clamp()` type is for the marketing hero
only. Inside the app (product register), type sizes are fixed rem steps on a
~1.2 ratio; a heading that shrinks inside a sidebar looks worse, not better.

## 4. Elevation

A hybrid leaning tonal. Depth is built primarily by **tonal layering** — the
three-step surface ramp stacked over the canvas — with **tinted shadows** added
only for genuine lift (hover, floating panels, modals). Shadows always carry the
canvas hue plus a faint accent cast; pure-black shadows are the single biggest
"cheap dark UI" tell and are forbidden.

### Shadow Vocabulary
- **shadow-sm** (`0 1px 2px rgba(4,4,10,0.6)`): resting cards and stats — a
  whisper, just enough to separate from the canvas.
- **shadow-md** (`0 4px 12px -2px rgba(4,4,10,0.55), 0 2px 6px -2px rgba(4,4,10,0.5)`):
  hover lift on interactive cards, floating preview panels.
- **shadow-lg** (`0 24px 50px -12px rgba(4,4,10,0.75), 0 8px 20px -8px var(--accent-glow)`):
  modals and the hero feature surface — the only place accent-glow enters a shadow.

### Named Rules
**The Layered-First Rule.** Reach for the next surface step before reaching for a
shadow. Shadows respond to state (hover, float, focus); they don't decorate a
resting surface.

**The Tinted-Shadow Rule.** Every shadow uses `rgba(4,4,10,…)`, never
`rgba(0,0,0,…)`. The canvas hue in the shadow is what makes the depth read premium.

## 5. Components

### Buttons
- **Shape:** Generously rounded — primary CTAs `rounded-xl` (12px), in-app
  controls `rounded-lg` (8px).
- **Primary:** solid accent fill, `accent-ink` text (12px 24px), accent-glow
  drop shadow. Hover → `accent-strong` + a touch more glow; `active:scale-[0.98]`.
- **Secondary / Ghost:** `surface` background, hairline border, `muted` text
  (6px 12px). Hover lifts text to `foreground` and border to accent.
- **States:** every button has hover, `:focus-visible` (2px `accent-strong`
  outline, 2px offset — global), and an active press-scale. No half-built states.

### Chips / Badges
- **Style:** `rounded-md`, hairline border, four tones — neutral (`surface-2` /
  `muted-strong`), accent (`accent/15` fill, `accent-strong` text, `accent/30`
  border), warn (`warning/15` fill, amber — caution), danger (`negative/15` fill,
  rose — failure). `text-xs` 500.
- **State:** selected = accent tone; the active tab uses an inset accent ring
  (`inset 0 0 0 1px accent-soft`) over an `accent/15` fill.

### Cards / Containers
- **Corner Style:** `rounded-xl` (12px); the floating preview panel goes `rounded-2xl` (16px).
- **Background:** `surface` over the canvas; nested data sits on `surface-2`.
- **Shadow Strategy:** `shadow-sm` at rest; `.card-lift` adds a 2px translate +
  `shadow-md` + brighter border on hover, but only for interactive cards (opt-in).
- **Border:** always a `border` hairline; brightens to `border-strong` on hover.
- **Internal Padding:** 20px (`p-5`) default; tighter (`p-4`) for control bars.
- **The No-Nested-Card Rule:** a card never contains another bordered card. Nest
  with the surface ramp (`surface-2`), not with a second box.

### Inputs / Fields
- **Style:** `surface` / `surface-2` fill, hairline border, `rounded-lg`.
- **Focus:** global `:focus-visible` ring (2px `accent-strong`, 2px offset);
  borders may also shift toward accent on focus-within.
- **Error:** `negative` text + `negative/30` border; never a color-only signal.

### Navigation
- **Style:** sticky top bar ≤72px, `background/75` with `backdrop-blur` and a
  `border/60` hairline. Brand wordmark left (mark in an `accent/15` tile), utility
  cluster right (AccentPicker · LanguageToggle · contextual CTA).
- **States:** the nav CTA is hidden in the first viewport (the hero owns the
  primary CTA) and fades in only after the hero scrolls past — no duplicate CTAs.
- **In-app tabs:** a single rounded `surface/60` rail of pill tabs; active pill is
  accent-toned, the rest are `muted` → `foreground` on hover. Horizontally
  scrollable on narrow screens.

### Signature: Diverging Correlation Heatmap & AccentPicker
- **Heatmap:** a custom CSS-grid matrix with a diverging color scale (negative →
  neutral → positive correlation). Data-native, not a charting-library default.
- **AccentPicker:** a `radiogroup` of four swatch dots; the active dot gets a
  double ring in its own color. Recolors the entire app — including Recharts fills
  via `useAccentColors()` — live, with no reload.

## 6. Do's and Don'ts

### Do:
- **Do** keep exactly one accent live and under ~10% of the surface (The One Accent Rule).
- **Do** build depth with the surface ramp first, shadow second (The Layered-First Rule).
- **Do** tint every shadow with `rgba(4,4,10,…)`, never pure black (The Tinted-Shadow Rule).
- **Do** set `.tnum` tabular figures on every standalone number (The Readout Rule).
- **Do** keep `muted` (#9a9aab) text at or above 4.5:1; bump toward `foreground` if it's even close.
- **Do** reserve `positive`/`negative` for real meaning only (The Semantic-Only Signal Rule).
- **Do** give every interactive element hover + `:focus-visible` + active states.
- **Do** ship a `prefers-reduced-motion` alternative for every animation (already global; keep it).

### Don't:
- **Don't** introduce glowing "magic"/"powered-by-AI" gradients, sci-fi chrome, or purple mysticism — hype undermines the *numbers-are-real* trust premise.
- **Don't** drift toward the **generic SaaS template**: no cream/indigo surfaces, no identical icon-heading-text card grids, no tracked-uppercase eyebrow above every section.
- **Don't** build **enterprise BI bloat**: no toolbar clutter, dropdown soup, or intimidating chrome density.
- **Don't** go **childish**: no bouncy/elastic easing, no emoji-as-UI, no gamified flourishes on a tool about correctness. (Sample-dataset emoji are content labels, not chrome — keep those contained.)
- **Don't** use a `border-left`/`border-right` > 1px as a colored accent stripe on cards, callouts, or alerts. Use full borders, background tints, or a leading icon.
- **Don't** use gradient text (`background-clip: text`). Emphasis comes from weight, size, or the solid accent.
- **Don't** nest a bordered card inside another card. Layer with `surface-2` instead.
- **Don't** let a second accent hue appear alongside the active one.
