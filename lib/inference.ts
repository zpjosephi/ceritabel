// lib/inference.ts
// Inferential statistics, computed in code (the LLM only explains results).
//
// Includes hand-written special functions (log-gamma, regularised incomplete
// beta & gamma) so we can compute exact p-values for the Student-t, F and
// chi-square distributions - no stats backend needed. Verified against R in
// inference.test.ts.

import { isMissing, parseNumber } from "./stats";
import type { ParsedDataset } from "./types";

// ---------------------------------------------------------------------------
// Special functions (Numerical Recipes style)
// ---------------------------------------------------------------------------

/** Lanczos approximation of ln Γ(x). */
export function logGamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

const FPMIN = 1e-300;

/** Continued fraction for the incomplete beta function. */
function betacf(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return h;
}

/** Regularised incomplete beta I_x(a,b). */
export function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Lower regularised incomplete gamma P(a,x) via series. */
function gammaSeries(a: number, x: number): number {
  if (x <= 0) return 0;
  const gln = logGamma(a);
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 0; n < 300; n++) {
    ap++;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gln);
}

/** Upper regularised incomplete gamma Q(a,x) via continued fraction. */
function gammaCf(a: number, x: number): number {
  const gln = logGamma(a);
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

/** Lower regularised incomplete gamma P(a,x). */
export function gammaP(a: number, x: number): number {
  if (x < 0 || a <= 0) return NaN;
  if (x < a + 1) return gammaSeries(a, x);
  return 1 - gammaCf(a, x);
}

// ---------------------------------------------------------------------------
// Distribution tails / p-values
// ---------------------------------------------------------------------------

/** Two-tailed p-value for a Student-t statistic. */
export function studentTTwoTailed(tStat: number, df: number): number {
  if (df <= 0) return NaN;
  const x = df / (df + tStat * tStat);
  return incompleteBeta(df / 2, 0.5, x);
}

/** CDF of the Student-t distribution. */
function studentTCdf(tStat: number, df: number): number {
  const p2 = studentTTwoTailed(tStat, df);
  return tStat > 0 ? 1 - 0.5 * p2 : 0.5 * p2;
}

/** Inverse Student-t CDF via bisection (used for confidence intervals). */
export function invStudentT(p: number, df: number): number {
  let lo = -1000;
  let hi = 1000;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (studentTCdf(mid, df) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Upper-tail p-value for an F statistic. */
export function fUpperTail(f: number, d1: number, d2: number): number {
  if (f <= 0) return 1;
  return incompleteBeta(d2 / 2, d1 / 2, d2 / (d2 + d1 * f));
}

/** Upper-tail p-value for a chi-square statistic. */
export function chiSquareUpperTail(x: number, df: number): number {
  if (x <= 0) return 1;
  return 1 - gammaP(df / 2, x / 2);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

export interface TTestResult {
  kind: "ttest";
  numericCol: string;
  groupCol: string;
  group1: string;
  group2: string;
  n1: number;
  n2: number;
  mean1: number;
  mean2: number;
  meanDiff: number;
  t: number;
  df: number;
  pValue: number;
  ci95: [number, number];
  cohensD: number;
}

export interface AnovaResult {
  kind: "anova";
  numericCol: string;
  groupCol: string;
  groups: { label: string; n: number; mean: number }[];
  fStat: number;
  dfBetween: number;
  dfWithin: number;
  pValue: number;
  etaSquared: number;
}

export interface ChiSquareResult {
  kind: "chisquare";
  rowVar: string;
  colVar: string;
  chi2: number;
  df: number;
  pValue: number;
  cramersV: number;
  n: number;
}

export interface CorrSigResult {
  kind: "corr";
  a: string;
  b: string;
  r: number;
  n: number;
  t: number;
  df: number;
  pValue: number;
}

export type TestResult =
  | TTestResult
  | AnovaResult
  | ChiSquareResult
  | CorrSigResult;

function mean(xs: number[]): number {
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}
function sampleVar(xs: number[], m: number): number {
  return xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1);
}

/** Welch's two-sample t-test (unequal variances). */
export function twoSampleTTest(
  values1: number[],
  values2: number[],
  numericCol: string,
  groupCol: string,
  group1: string,
  group2: string,
): TTestResult {
  const n1 = values1.length;
  const n2 = values2.length;
  const m1 = mean(values1);
  const m2 = mean(values2);
  const v1 = sampleVar(values1, m1);
  const v2 = sampleVar(values2, m2);
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = (m1 - m2) / se;
  const df =
    (v1 / n1 + v2 / n2) ** 2 /
    ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  const pValue = studentTTwoTailed(t, df);
  const tCrit = invStudentT(0.975, df);
  const diff = m1 - m2;
  const ci95: [number, number] = [diff - tCrit * se, diff + tCrit * se];
  const pooledSd = Math.sqrt(
    ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2),
  );
  const cohensD = pooledSd > 0 ? diff / pooledSd : NaN;
  return {
    kind: "ttest",
    numericCol,
    groupCol,
    group1,
    group2,
    n1,
    n2,
    mean1: m1,
    mean2: m2,
    meanDiff: diff,
    t,
    df,
    pValue,
    ci95,
    cohensD,
  };
}

/** One-way ANOVA. */
export function oneWayAnova(
  groups: { label: string; values: number[] }[],
  numericCol: string,
  groupCol: string,
): AnovaResult {
  const all = groups.flatMap((g) => g.values);
  const grand = mean(all);
  const N = all.length;
  const k = groups.length;
  let ssb = 0;
  let ssw = 0;
  const summary = groups.map((g) => {
    const m = mean(g.values);
    ssb += g.values.length * (m - grand) ** 2;
    ssw += g.values.reduce((s, v) => s + (v - m) ** 2, 0);
    return { label: g.label, n: g.values.length, mean: m };
  });
  const dfBetween = k - 1;
  const dfWithin = N - k;
  const msb = ssb / dfBetween;
  const msw = ssw / dfWithin;
  const fStat = msb / msw;
  const pValue = fUpperTail(fStat, dfBetween, dfWithin);
  const etaSquared = ssb / (ssb + ssw);
  return {
    kind: "anova",
    numericCol,
    groupCol,
    groups: summary,
    fStat,
    dfBetween,
    dfWithin,
    pValue,
    etaSquared,
  };
}

/** Chi-square test of independence from a contingency table. */
export function chiSquareTest(
  table: number[][],
  rowVar: string,
  colVar: string,
): ChiSquareResult {
  const rows = table.length;
  const cols = table[0]?.length ?? 0;
  const rowTotals = table.map((r) => r.reduce((s, v) => s + v, 0));
  const colTotals = Array.from({ length: cols }, (_, j) =>
    table.reduce((s, r) => s + r[j], 0),
  );
  const n = rowTotals.reduce((s, v) => s + v, 0);
  let chi2 = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / n;
      if (expected > 0) chi2 += (table[i][j] - expected) ** 2 / expected;
    }
  }
  const df = (rows - 1) * (cols - 1);
  const pValue = chiSquareUpperTail(chi2, df);
  const cramersV = Math.sqrt(chi2 / (n * Math.min(rows - 1, cols - 1)));
  return { kind: "chisquare", rowVar, colVar, chi2, df, pValue, cramersV, n };
}

/** Significance test for a Pearson correlation. */
export function correlationSignificance(
  xs: number[],
  ys: number[],
  a: string,
  b: string,
): CorrSigResult {
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    cov += (xs[i] - mx) * (ys[i] - my);
    vx += (xs[i] - mx) ** 2;
    vy += (ys[i] - my) ** 2;
  }
  const r = cov / Math.sqrt(vx * vy);
  const df = n - 2;
  const t = r * Math.sqrt(df / (1 - r * r));
  const pValue = studentTTwoTailed(t, df);
  return { kind: "corr", a, b, r, n, t, df, pValue };
}

// ---------------------------------------------------------------------------
// Dispatcher: pick & run the right test from two chosen columns
// ---------------------------------------------------------------------------

export type ColType = "numeric" | "categorical";

export interface TestError {
  kind: "error";
  message: string;
}

function numericByGroup(
  ds: ParsedDataset,
  numericCol: string,
  groupCol: string,
): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  for (const row of ds.rows) {
    const g = row[groupCol];
    const v = parseNumber(row[numericCol]);
    if (isMissing(g) || v === null) continue;
    const key = (g as string).trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }
  return groups;
}

export function runHypothesisTest(
  ds: ParsedDataset,
  colA: { name: string; type: ColType },
  colB: { name: string; type: ColType },
): TestResult | TestError {
  // numeric × numeric → correlation significance
  if (colA.type === "numeric" && colB.type === "numeric") {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const row of ds.rows) {
      const x = parseNumber(row[colA.name]);
      const y = parseNumber(row[colB.name]);
      if (x !== null && y !== null) {
        xs.push(x);
        ys.push(y);
      }
    }
    if (xs.length < 3)
      return { kind: "error", message: "Butuh ≥ 3 pasangan data." };
    return correlationSignificance(xs, ys, colA.name, colB.name);
  }

  // numeric × categorical → t-test (2 groups) or ANOVA (≥3 groups)
  const numericCol =
    colA.type === "numeric" ? colA.name : colB.type === "numeric" ? colB.name : null;
  const groupCol =
    colA.type === "categorical"
      ? colA.name
      : colB.type === "categorical"
        ? colB.name
        : null;

  if (numericCol && groupCol) {
    const groups = numericByGroup(ds, numericCol, groupCol);
    // keep groups with at least 2 observations
    const usable = [...groups.entries()].filter(([, v]) => v.length >= 2);
    if (usable.length < 2)
      return {
        kind: "error",
        message: "Butuh ≥ 2 kelompok dengan masing-masing ≥ 2 data.",
      };
    if (usable.length === 2) {
      return twoSampleTTest(
        usable[0][1],
        usable[1][1],
        numericCol,
        groupCol,
        usable[0][0],
        usable[1][0],
      );
    }
    return oneWayAnova(
      usable.map(([label, values]) => ({ label, values })),
      numericCol,
      groupCol,
    );
  }

  // categorical × categorical → chi-square
  if (colA.type === "categorical" && colB.type === "categorical") {
    const rowLevels = new Map<string, number>();
    const colLevels = new Map<string, number>();
    const complete: [string, string][] = [];
    for (const row of ds.rows) {
      const a = row[colA.name];
      const b = row[colB.name];
      if (isMissing(a) || isMissing(b)) continue;
      const ra = (a as string).trim();
      const cb = (b as string).trim();
      if (!rowLevels.has(ra)) rowLevels.set(ra, rowLevels.size);
      if (!colLevels.has(cb)) colLevels.set(cb, colLevels.size);
      complete.push([ra, cb]);
    }
    if (rowLevels.size < 2 || colLevels.size < 2)
      return {
        kind: "error",
        message: "Tiap kolom kategori butuh ≥ 2 nilai berbeda.",
      };
    const table = Array.from({ length: rowLevels.size }, () =>
      Array<number>(colLevels.size).fill(0),
    );
    for (const [ra, cb] of complete) {
      table[rowLevels.get(ra)!][colLevels.get(cb)!]++;
    }
    return chiSquareTest(table, colA.name, colB.name);
  }

  return { kind: "error", message: "Kombinasi kolom tidak didukung." };
}
