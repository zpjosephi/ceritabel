# ceritabel 🗣️📊

> **Upload your data, understand it in plain English.**

A web app where you upload a CSV, and **ceritabel** runs a correct statistical
EDA (exploratory data analysis) **in your browser**, then an AI explains the
findings in plain language and suggests follow-up analyses.

The key idea: **all numbers are computed in code (TypeScript), never by the
LLM.** The AI only *interprets* numbers the code already calculated — so it
never invents figures.

---

## Features

- **Drag & drop CSV upload** — parsed in-browser with PapaParse.
- **Auto-EDA**, computed in code:
  - Per-column summary: type detection (numeric / categorical), count, missing
    values, and — for numeric — mean, median, **sample std (n−1)**, min, max,
    Q1/Q3, skewness, outlier count.
  - **Pearson correlation matrix** (pairwise-complete, with guards).
  - **IQR outlier detection** (1.5× fence).
  - **Simple linear regression** when you pick two numeric columns.
- **Visualisations** with Recharts + a custom heatmap:
  - Histogram (Sturges binning) per numeric column, bar chart per categorical.
  - Correlation **heatmap** (custom CSS grid, diverging color scale).
  - **Scatter plot** with optional regression line.
- **AI Insight (Google Gemini)** — receives only the computed `StatsSummary`
  (JSON), returns a plain-language story, notable findings, and exactly 3
  follow-up suggestions.
- **Chat** — ask questions about your data; answers are grounded in the same
  computed summary.
- **Privacy first** — files are processed in memory and never stored; only the
  statistics summary (never raw rows) is sent to the server.

---

## Architecture

```
[ Browser ]  upload CSV → PapaParse → lib/stats.ts (all EDA) → render charts
                                                   │
                                                   ▼  POST /api/insight { summary }
[ Server (Next route handler) ]  build prompt → Gemini (GEMINI_API_KEY) → AIInsight
                                                   │
                                                   ▼
[ Browser ]  render AI Insight panel
```

Raw rows stop in the browser. Only `StatsSummary` crosses to the server.

| Layer | Tech |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS v4 (dark, single violet accent) |
| CSV | PapaParse |
| Statistics | simple-statistics + custom (quantiles, binning) |
| Charts | Recharts (+ custom heatmap) |
| LLM | Google Gemini (`@google/genai`, model `gemini-2.5-flash`) |
| Tests | Vitest |
| Deploy | Vercel |

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Without an API key the app still parses, computes stats and renders all charts;
only the AI Insight / Chat panels will show a friendly error.

### Set up the Gemini API key (free, no credit card)

1. Open **Google AI Studio** → https://aistudio.google.com and sign in.
2. Click **Get API key → Create API key**, then copy it.
3. Create `.env.local` in the project root (already gitignored):
   ```
   GEMINI_API_KEY=your_key_here
   ```
4. Restart `npm run dev`.

> The key is read only on the server (`process.env.GEMINI_API_KEY`) inside the
> route handlers. It is never exposed to the client and never prefixed with
> `NEXT_PUBLIC_`.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (must pass) |
| `npm test` | Run the statistics unit tests (Vitest) |
| `npm run lint` | ESLint |

### Tests

`lib/stats.test.ts` verifies the statistics against hand-computed values
(mean, sample std, quartiles, Pearson r, regression, outliers, type detection).
This is the proof that the numbers are real, not guessed.

```bash
npm test
```

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to https://vercel.com → **Add New → Project** → import the repo.
3. Add an environment variable **`GEMINI_API_KEY`** (Production + Preview).
4. **Deploy.** Vercel gives you a `*.vercel.app` URL.

CLI alternative:

```bash
npm i -g vercel
vercel
```

---

## Project structure

```
app/
  layout.tsx              root layout (dark theme, fonts)
  globals.css             Tailwind + theme tokens (violet accent)
  page.tsx                Landing
  analyze/page.tsx        Upload + results (in-memory state)
  api/insight/route.ts    POST: summary → Gemini → insight
  api/chat/route.ts       POST: question → answer (grounded in summary)
components/               FileUpload, charts, heatmap, AI panel, chat, ui
lib/
  types.ts                StatsSummary & related types (the data contract)
  csv.ts                  PapaParse wrapper
  stats.ts                ALL statistics (pure functions)
  stats.test.ts           unit tests with known values
  prompt.ts               LLM prompt builder ("never invent numbers")
  llm.ts                  server-only Gemini client
  parseInsight.ts         robust JSON parsing of the AI response
  config.ts               INSIGHT_LANG, model name, thresholds
```

---

Portfolio project — Computer Science × Statistics.
