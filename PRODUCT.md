# Product

## Register

product

## Users

Mixed, broad audience — anyone who has a CSV and a question about it. The range
runs from non-technical people who don't know statistics to data-savvy analysts
who do. Their shared context: they have tabular data, limited time, and want a
*correct* answer they can trust without setting up a notebook or a BI tool. The
job to be done is "upload my data → understand what's actually in it → get a
plain-language read on the findings and what to look at next." The UI must serve
beginners (explain, don't intimidate) without slowing down people who already
read a correlation matrix at a glance. Bilingual (English / Indonesian) — the
name itself is *cerita* (story) + *tabel* (table).

## Product Purpose

ceritabel turns a raw CSV into a correct exploratory data analysis in the
browser, then has an AI explain the findings in plain language. The defining
constraint and selling point: **every number is computed in TypeScript, never by
the LLM** — the AI only interprets statistics the code already calculated, so it
can't invent figures. Success looks like a user trusting the output enough to act
on it: the stats are demonstrably real (unit-tested against hand-computed
values), the charts are honest, and the narrative never overstates what the data
shows. Privacy is part of the promise — raw rows never leave the browser; only
the computed summary is sent to the server.

## Brand Personality

Sharp, modern, confident. A crisp contemporary analyst's tool — fast,
self-assured, and quietly authoritative without being loud. The voice is
plain-spoken and precise: it states what the numbers say, flags uncertainty
honestly, and never hypes. The emotional goal is **trust and precision** — users
should leave confident the figures are real and correct. Calm, credible, no
theatrics; accuracy is the brand.

## Anti-references

- **Hype-y AI startup.** No glowing "magic"/"powered by AI" bragging, sci-fi
  chrome, or purple-gradient mysticism. Hype undermines the whole trust premise —
  the point is that the numbers are real, not magical.
- **Generic SaaS template.** No cream/indigo landing pages, identical
  feature-card grids, tracked-uppercase section eyebrows, or hero-metric clichés.
- **Enterprise BI bloat.** No Tableau/PowerBI-style toolbar clutter, dropdown
  soup, or intimidating chrome density. Power without the cockpit.
- **Childish / overly playful.** No cartoon mascots, bouncy/elastic motion, or
  emoji-soup gamification. Anything that reads as not-serious about correctness
  works against the brand.

## Design Principles

- **The numbers are real — make that legible.** Correctness is the product.
  Tabular figures, honest charts, visible precision, unit-tested math. Never let
  the UI imply more certainty (or more magic) than the statistics support.
- **Earn trust through restraint, not theatrics.** Confidence is shown by a calm,
  precise surface, not by glow and hype. When tempted to dazzle, clarify instead.
- **Serve both ends of the audience on one screen.** Progressive depth: a
  beginner gets a plain-language read; an analyst gets the dense numbers a click
  (or a glance) away. Don't dumb down, don't intimidate.
- **Data-native, not dashboard-generic.** Visual language drawn from plotting and
  measurement (graph-paper grids, tabular numerics, diverging scales) rather than
  off-the-shelf SaaS scaffolding.
- **Privacy is a feature, so say it plainly.** The in-browser, rows-never-leave
  guarantee is part of the trust story; surface it where it reassures, without
  turning it into a badge wall.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**: body text ≥ 4.5:1 contrast (large/bold text ≥ 3:1),
visible keyboard focus on every interactive element, full keyboard navigability,
and a `prefers-reduced-motion` alternative for all motion. The dark theme already
implements focus-visible outlines and a reduced-motion block — hold new work to
the same bar. **Future nice-to-have:** colorblind-safe (CVD-checked) palettes for
the correlation heatmap's diverging scale and any categorical chart colors, since
the product is chart-heavy and color carries meaning.
