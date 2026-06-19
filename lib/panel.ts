// lib/panel.ts
// Panel-data (longitudinal) detection & summary — computed in code.
//
// Auto-detects an (entity, time) structure, then reports the panel shape and a
// within/between variance decomposition (à la Stata's xtsum). Detection is a
// heuristic guess; the UI lets the user confirm/override the chosen columns.

import { isMissing, parseNumber } from "./stats";
import type { FullAnalysis } from "./stats";
import type { ParsedDataset } from "./types";

const TIME_NAME = /(^|_|\s)(year|tahun|date|tanggal|period|periode|quarter|kuartal|triwulan|month|bulan|week|minggu|waktu|time|t)(_|\s|$)/i;
const ENTITY_NAME = /(^|_|\s)(id|kode|code|country|negara|firm|perusahaan|company|name|nama|entity|unit|region|wilayah|provinsi|province|state|kabupaten|kota|player|team|user)(_|\s|$)/i;

function distinctNonMissing(values: (string | null)[]): Set<string> {
  const s = new Set<string>();
  for (const v of values) if (!isMissing(v)) s.add((v as string).trim());
  return s;
}

/** Heuristic score that a column represents TIME. */
function timeScore(name: string, values: (string | null)[]): number {
  let score = 0;
  if (TIME_NAME.test(name)) score += 5;
  const present = values.filter((v) => !isMissing(v)) as string[];
  if (present.length === 0) return 0;

  // Year-like integers (e.g. 1990..2030)
  const nums = present.map((v) => parseNumber(v)).filter((n): n is number => n !== null);
  if (nums.length >= present.length * 0.9) {
    const yearLike = nums.filter((n) => Number.isInteger(n) && n >= 1900 && n <= 2100);
    if (yearLike.length >= nums.length * 0.9) score += 4;
  }
  // Date-parseable
  const dateLike = present.filter((v) => !Number.isNaN(Date.parse(v)));
  if (dateLike.length >= present.length * 0.9 && !TIME_NAME.test(name)) score += 2;

  return score;
}

/** Best time-like column in the dataset, or null. */
export function findTimeColumn(ds: ParsedDataset): string | null {
  let timeCol = "";
  let best = 0;
  for (const c of ds.fields) {
    const s = timeScore(c, ds.rows.map((r) => r[c] ?? null));
    if (s > best) {
      best = s;
      timeCol = c;
    }
  }
  return best >= 3 ? timeCol : null;
}

/** Best-guess (entity, time) columns, or null if it doesn't look like a panel. */
export function detectPanel(
  ds: ParsedDataset,
  analysis: FullAnalysis,
): { entityCol: string; timeCol: string } | null {
  const cols = ds.fields;
  const colValues = new Map<string, (string | null)[]>();
  for (const c of cols) colValues.set(c, ds.rows.map((r) => r[c] ?? null));

  // 1. pick the best time column
  let timeCol = "";
  let bestTime = 0;
  for (const c of cols) {
    const s = timeScore(c, colValues.get(c)!);
    if (s > bestTime) {
      bestTime = s;
      timeCol = c;
    }
  }
  if (!timeCol || bestTime < 3) return null;

  // 2. pick the entity column that best forms a panel grid with time
  let entityCol = "";
  let bestScore = -1;
  for (const c of cols) {
    if (c === timeCol) continue;
    const vals = colValues.get(c)!;
    const distinct = distinctNonMissing(vals);
    const n = distinct.size;
    const rows = ds.rows.length;
    if (n < 2 || n >= rows) continue; // must repeat & have variety
    const avgPerEntity = rows / n;
    if (avgPerEntity < 1.5) continue; // entity should recur over time

    const { uniqueness } = gridStats(ds, c, timeCol);
    if (uniqueness < 0.85) continue;

    let score = uniqueness * 10;
    if (ENTITY_NAME.test(c)) score += 5;
    if (analysis.columnTypes[c] === "categorical") score += 1;
    if (score > bestScore) {
      bestScore = score;
      entityCol = c;
    }
  }
  if (!entityCol) return null;
  return { entityCol, timeCol };
}

/** Uniqueness of (entity, time) pairs — ≈1 means a proper panel grid. */
function gridStats(ds: ParsedDataset, entityCol: string, timeCol: string) {
  const pairs = new Set<string>();
  const entities = new Set<string>();
  const times = new Set<string>();
  let nObs = 0;
  for (const r of ds.rows) {
    const e = r[entityCol];
    const t = r[timeCol];
    if (isMissing(e) || isMissing(t)) continue;
    const ek = (e as string).trim();
    const tk = (t as string).trim();
    entities.add(ek);
    times.add(tk);
    pairs.add(`${ek}${tk}`);
    nObs++;
  }
  const uniqueness = nObs > 0 ? pairs.size / nObs : 0;
  return {
    nObs,
    nEntities: entities.size,
    nPeriods: times.size,
    distinctPairs: pairs.size,
    uniqueness,
  };
}

export interface PanelVarDecomp {
  column: string;
  overallMean: number;
  overallSd: number;
  betweenSd: number;
  withinSd: number;
  nObs: number;
}

export interface PanelResult {
  entityCol: string;
  timeCol: string;
  nEntities: number;
  nPeriods: number;
  nObs: number;
  uniquenessPct: number;
  completenessPct: number; // observed cells / (N*T)
  balanced: boolean;
  decomposition: PanelVarDecomp[];
}

function sd(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = values.reduce((s, v) => s + v, 0) / n;
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
}

/**
 * Within/between decomposition for one numeric column (Stata xtsum style):
 * overall SD over all obs, between SD over entity means, within SD over
 * (x_it − x̄_i + x̄).
 */
function decompose(
  ds: ParsedDataset,
  column: string,
  entityCol: string,
): PanelVarDecomp {
  const byEntity = new Map<string, number[]>();
  const all: number[] = [];
  for (const r of ds.rows) {
    const e = r[entityCol];
    const x = parseNumber(r[column]);
    if (isMissing(e) || x === null) continue;
    const ek = (e as string).trim();
    if (!byEntity.has(ek)) byEntity.set(ek, []);
    byEntity.get(ek)!.push(x);
    all.push(x);
  }
  const nObs = all.length;
  const grand = nObs > 0 ? all.reduce((s, v) => s + v, 0) / nObs : NaN;

  const entityMeans: number[] = [];
  const within: number[] = [];
  for (const vals of byEntity.values()) {
    const m = vals.reduce((s, v) => s + v, 0) / vals.length;
    entityMeans.push(m);
    for (const v of vals) within.push(v - m + grand);
  }

  return {
    column,
    overallMean: grand,
    overallSd: sd(all),
    betweenSd: sd(entityMeans),
    withinSd: sd(within),
    nObs,
  };
}

/** Full panel summary for a chosen (entity, time) pair. */
export function computePanel(
  ds: ParsedDataset,
  analysis: FullAnalysis,
  entityCol: string,
  timeCol: string,
): PanelResult {
  const g = gridStats(ds, entityCol, timeCol);
  const completeness =
    g.nEntities * g.nPeriods > 0
      ? g.distinctPairs / (g.nEntities * g.nPeriods)
      : 0;
  const balanced = completeness >= 0.999 && g.uniqueness >= 0.999;

  const numericCols = analysis.numericStats
    .map((s) => s.name)
    .filter((name) => name !== entityCol && name !== timeCol);

  const decomposition = numericCols.map((c) => decompose(ds, c, entityCol));

  return {
    entityCol,
    timeCol,
    nEntities: g.nEntities,
    nPeriods: g.nPeriods,
    nObs: g.nObs,
    uniquenessPct: g.uniqueness * 100,
    completenessPct: completeness * 100,
    balanced,
    decomposition,
  };
}
