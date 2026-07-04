// lib/stats.ts
// All EDA statistics, computed in code.
// These are PURE functions so they can be unit-tested with known datasets.
//
// We lean on `simple-statistics` for well-tested primitives (mean, sample std,
// Pearson correlation, skewness, linear regression) but compute quantiles with
// our own type-7 (R-7) linear interpolation so that median, Q1, Q3 and the IQR
// outlier fences are guaranteed to use ONE consistent method.

import {
  mean as ssMean,
  sampleStandardDeviation,
  sampleCorrelation,
  sampleSkewness,
  linearRegression,
} from "simple-statistics";
import type {
  ColumnSummary,
  ColumnType,
  ColumnKind,
  CorrelationMatrix,
  CorrelationPair,
  HistogramBin,
  NumericSummary,
  CategoricalSummary,
  ParsedDataset,
  RegressionResult,
  StatsSummary,
} from "./types";
import { STRONG_CORRELATION_THRESHOLD, TOP_CATEGORIES } from "./config";

// ---------------------------------------------------------------------------
// Missing values & number parsing
// ---------------------------------------------------------------------------

const MISSING_TOKENS = new Set([
  "",
  "na",
  "n/a",
  "null",
  "nan",
  "-",
  "?",
]);

/** True when a raw cell should be treated as missing. Case-insensitive. */
export function isMissing(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  const t = value.trim().toLowerCase();
  return MISSING_TOKENS.has(t);
}

/**
 * Parse a cell into a finite number, or null if it isn't one. Tolerant of
 * common formatting: a leading currency token (Rp/IDR/USD/$/€/£/¥/₹), thousands
 * separators, and a trailing percent sign - so "$1,200" and "5%" parse as
 * numbers (using the displayed value).
 */
export function parseNumber(value: string | null | undefined): number | null {
  if (isMissing(value)) return null;
  let s = (value as string).trim();
  s = s.replace(/^(rp|idr|usd|us\$|\$|€|£|¥|₹)\s*/i, ""); // leading currency
  s = s.replace(/[,\s]/g, ""); // thousands separators / spaces
  if (s.endsWith("%")) s = s.slice(0, -1); // trailing percent
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Detect column type: numeric if >= 80% of non-missing values parse as finite
 * numbers, otherwise categorical.
 */
export function detectColumnType(values: (string | null)[]): ColumnType {
  const nonMissing = values.filter((v) => !isMissing(v));
  if (nonMissing.length === 0) return "categorical";
  const numericCount = nonMissing.filter((v) => parseNumber(v) !== null).length;
  return numericCount / nonMissing.length >= 0.8 ? "numeric" : "categorical";
}

const BOOL_TOKENS = new Set([
  "true",
  "false",
  "yes",
  "no",
  "ya",
  "tidak",
  "y",
  "n",
]);

const DATE_RE =
  /^\d{4}[-/]\d{1,2}([-/]\d{1,2})?([ T]\d{1,2}:\d{2})?|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/;

/** Does a value look like a date/time (not just a bare number)? */
function isDateLike(v: string): boolean {
  const s = v.trim();
  if (DATE_RE.test(s)) return true;
  // textual dates like "Jan 2020", "2020 Q1" - require a separator/letter and
  // a successful Date.parse, but never a bare number (years stay numeric).
  if (parseNumber(s) !== null) return false;
  return /[-/:]/.test(s) && !Number.isNaN(Date.parse(s));
}

/**
 * Richer column kind used for data-shape awareness & UI. The statistical engine
 * still summarises datetime/boolean columns via the categorical path; this only
 * adds finer classification.
 */
export function detectColumnKind(values: (string | null)[]): ColumnKind {
  const nonMissing = values.filter((v) => !isMissing(v)) as string[];
  if (nonMissing.length === 0) return "categorical";

  // boolean: at most 2 distinct values, all from the boolean vocabulary
  const distinct = new Set(nonMissing.map((v) => v.trim().toLowerCase()));
  if (distinct.size > 0 && distinct.size <= 2) {
    if ([...distinct].every((v) => BOOL_TOKENS.has(v))) return "boolean";
  }

  // datetime: >= 80% look like dates
  const dateCount = nonMissing.filter(isDateLike).length;
  if (dateCount / nonMissing.length >= 0.8) return "datetime";

  // numeric
  const numCount = nonMissing.filter((v) => parseNumber(v) !== null).length;
  if (numCount / nonMissing.length >= 0.8) return "numeric";

  return "categorical";
}

// ---------------------------------------------------------------------------
// Quantiles - type-7 (R-7) linear interpolation, used everywhere consistently
// ---------------------------------------------------------------------------

/** Quantile of an already-sorted ascending array, p in [0,1]. */
export function quantileSorted(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  const h = (n - 1) * p;
  const lo = Math.floor(h);
  const frac = h - lo;
  if (lo + 1 >= n) return sorted[n - 1];
  return sorted[lo] + frac * (sorted[lo + 1] - sorted[lo]);
}

// ---------------------------------------------------------------------------
// Numeric column summary + outliers
// ---------------------------------------------------------------------------

export interface NumericStats extends NumericSummary {
  /** Sample outlier values (capped) - kept client-side, not sent to AI. */
  outlierExamples: number[];
  lowerFence: number;
  upperFence: number;
}

export function summarizeNumeric(
  name: string,
  rawValues: (string | null)[],
): NumericStats {
  const total = rawValues.length;
  const nums = rawValues
    .map(parseNumber)
    .filter((v): v is number => v !== null);
  const count = nums.length;
  const missing = total - count;
  const missingPct = total > 0 ? (missing / total) * 100 : 0;

  // Degenerate: no usable numbers. Return a safe, non-crashing summary.
  if (count === 0) {
    return {
      name,
      type: "numeric",
      count: 0,
      missing,
      missingPct,
      mean: NaN,
      median: NaN,
      std: NaN,
      min: NaN,
      max: NaN,
      q1: NaN,
      q3: NaN,
      skewness: undefined,
      outlierCount: 0,
      outlierExamples: [],
      lowerFence: NaN,
      upperFence: NaN,
    };
  }

  const sorted = [...nums].sort((a, b) => a - b);
  const mean = ssMean(nums);
  const median = quantileSorted(sorted, 0.5);
  const q1 = quantileSorted(sorted, 0.25);
  const q3 = quantileSorted(sorted, 0.75);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  // sample std needs n >= 2
  const std = count >= 2 ? sampleStandardDeviation(nums) : 0;
  // skewness needs n >= 3 and non-zero variance
  let skewness: number | undefined;
  if (count >= 3 && std > 0) {
    try {
      skewness = sampleSkewness(nums);
    } catch {
      skewness = undefined;
    }
  }

  // IQR outlier fences. Guard IQR === 0 → no outliers.
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  let outliers: number[] = [];
  if (iqr > 0) {
    outliers = nums.filter((v) => v < lowerFence || v > upperFence);
  }

  return {
    name,
    type: "numeric",
    count,
    missing,
    missingPct,
    mean,
    median,
    std,
    min,
    max,
    q1,
    q3,
    skewness,
    outlierCount: outliers.length,
    outlierExamples: outliers.slice(0, 5),
    lowerFence,
    upperFence,
  };
}

// ---------------------------------------------------------------------------
// Categorical column summary
// ---------------------------------------------------------------------------

export function summarizeCategorical(
  name: string,
  rawValues: (string | null)[],
): CategoricalSummary {
  const total = rawValues.length;
  const present = rawValues
    .filter((v) => !isMissing(v))
    .map((v) => (v as string).trim());
  const count = present.length;
  const missing = total - count;
  const missingPct = total > 0 ? (missing / total) * 100 : 0;

  const freq = new Map<string, number>();
  for (const v of present) freq.set(v, (freq.get(v) ?? 0) + 1);

  const topCategories = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_CATEGORIES)
    .map(([value, c]) => ({
      value,
      count: c,
      pct: count > 0 ? (c / count) * 100 : 0,
    }));

  return {
    name,
    type: "categorical",
    count,
    missing,
    missingPct,
    uniqueCount: freq.size,
    topCategories,
  };
}

// ---------------------------------------------------------------------------
// Histogram binning - Sturges' rule, capped to 10-30 bins
// ---------------------------------------------------------------------------

export function histogramBins(rawValues: (string | null)[]): HistogramBin[] {
  const nums = rawValues
    .map(parseNumber)
    .filter((v): v is number => v !== null);
  if (nums.length === 0) return [];

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) {
    // Constant column → single bin.
    return [
      { x0: min, x1: max, count: nums.length, label: fmtRange(min, max) },
    ];
  }

  // Sturges' rule, then cap to a practical range.
  let k = Math.ceil(Math.log2(nums.length)) + 1;
  k = Math.max(5, Math.min(30, k));

  const width = (max - min) / k;
  const bins: HistogramBin[] = Array.from({ length: k }, (_, i) => {
    const x0 = min + i * width;
    const x1 = i === k - 1 ? max : min + (i + 1) * width;
    return { x0, x1, count: 0, label: fmtRange(x0, x1) };
  });

  for (const v of nums) {
    let idx = Math.floor((v - min) / width);
    if (idx >= k) idx = k - 1; // include max in the last bin
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }
  return bins;
}

function fmtRange(a: number, b: number): string {
  return `${fmtNum(a)}-${fmtNum(b)}`;
}

/** Compact number formatting for labels. */
export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "-";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 0.01 || abs >= 1e6)) return n.toExponential(2);
  return Number(n.toFixed(2)).toString();
}

// ---------------------------------------------------------------------------
// Pearson correlation matrix
// ---------------------------------------------------------------------------

/**
 * Pairwise-complete Pearson correlation for one pair. Returns null when
 * undefined (n < 3 or zero variance in either variable).
 */
export function pearsonPairwise(
  xs: (number | null)[],
  ys: (number | null)[],
): number | null {
  const px: number[] = [];
  const py: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];
    if (x !== null && y !== null && Number.isFinite(x) && Number.isFinite(y)) {
      px.push(x);
      py.push(y);
    }
  }
  if (px.length < 3) return null;
  const sx = sampleStandardDeviation(px);
  const sy = sampleStandardDeviation(py);
  if (sx <= 0 || sy <= 0) return null;
  const r = sampleCorrelation(px, py);
  return Number.isFinite(r) ? r : null;
}

export function correlationMatrix(
  numericColumns: { name: string; values: (number | null)[] }[],
): CorrelationMatrix {
  const fields = numericColumns.map((c) => c.name);
  const n = fields.length;
  const matrix: (number | null)[][] = Array.from({ length: n }, () =>
    Array<number | null>(n).fill(null),
  );

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const r = pearsonPairwise(
        numericColumns[i].values,
        numericColumns[j].values,
      );
      matrix[i][j] = r;
      matrix[j][i] = r;
    }
  }
  return { fields, matrix };
}

/** Strong correlations (|r| >= threshold), sorted by |r| descending. */
export function strongCorrelations(
  cm: CorrelationMatrix,
  threshold = STRONG_CORRELATION_THRESHOLD,
): CorrelationPair[] {
  const out: CorrelationPair[] = [];
  for (let i = 0; i < cm.fields.length; i++) {
    for (let j = i + 1; j < cm.fields.length; j++) {
      const r = cm.matrix[i][j];
      if (r !== null && Math.abs(r) >= threshold) {
        out.push({ a: cm.fields[i], b: cm.fields[j], r: round2(r) });
      }
    }
  }
  return out.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
}

// ---------------------------------------------------------------------------
// Simple linear regression
// ---------------------------------------------------------------------------

export function simpleLinearRegression(
  xField: string,
  yField: string,
  xs: (number | null)[],
  ys: (number | null)[],
): RegressionResult | null {
  const pairs: [number, number][] = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];
    if (x !== null && y !== null && Number.isFinite(x) && Number.isFinite(y)) {
      pairs.push([x, y]);
    }
  }
  if (pairs.length < 3) return null;
  const sx = sampleStandardDeviation(pairs.map((p) => p[0]));
  const sy = sampleStandardDeviation(pairs.map((p) => p[1]));
  if (sx <= 0 || sy <= 0) return null;

  const { m, b } = linearRegression(pairs);
  const r = sampleCorrelation(
    pairs.map((p) => p[0]),
    pairs.map((p) => p[1]),
  );
  return {
    xField,
    yField,
    slope: m,
    intercept: b,
    r2: r * r,
    n: pairs.length,
  };
}

// ---------------------------------------------------------------------------
// Top-level: build everything from a parsed dataset
// ---------------------------------------------------------------------------

export interface FullAnalysis {
  rowCount: number;
  columnCount: number;
  columnTypes: Record<string, ColumnType>;
  /** Richer per-column kind (numeric/categorical/datetime/boolean). */
  columnKinds: Record<string, ColumnKind>;
  numericStats: NumericStats[];
  categoricalStats: CategoricalSummary[];
  /** All column summaries in original column order. */
  columns: ColumnSummary[];
  correlation: CorrelationMatrix;
  summary: StatsSummary; // the payload sent to the AI
}

export function analyzeDataset(ds: ParsedDataset): FullAnalysis {
  const { fields, rows } = ds;
  const rowCount = rows.length;

  const columnTypes: Record<string, ColumnType> = {};
  const columnKinds: Record<string, ColumnKind> = {};
  const numericStats: NumericStats[] = [];
  const categoricalStats: CategoricalSummary[] = [];
  const columns: ColumnSummary[] = [];
  const numericColumns: { name: string; values: (number | null)[] }[] = [];

  for (const field of fields) {
    const raw = rows.map((r) => r[field] ?? null);
    const type = detectColumnType(raw);
    columnTypes[field] = type;
    columnKinds[field] = detectColumnKind(raw);

    if (type === "numeric") {
      const ns = summarizeNumeric(field, raw);
      numericStats.push(ns);
      // strip client-only fields for the public ColumnSummary
      const { outlierExamples, lowerFence, upperFence, ...pub } = ns;
      void outlierExamples;
      void lowerFence;
      void upperFence;
      columns.push(pub);
      numericColumns.push({ name: field, values: raw.map(parseNumber) });
    } else {
      const cs = summarizeCategorical(field, raw);
      categoricalStats.push(cs);
      columns.push(cs);
    }
  }

  const correlation = correlationMatrix(numericColumns);
  const strong = strongCorrelations(correlation);

  const notableOutliers = numericStats
    .filter((s) => s.outlierCount > 0)
    .map((s) => ({
      column: s.name,
      count: s.outlierCount,
      pct: s.count > 0 ? round2((s.outlierCount / s.count) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  // Build the public StatsSummary with rounded numeric fields.
  const summaryColumns: ColumnSummary[] = columns.map((c) =>
    c.type === "numeric" ? roundNumericSummary(c) : c,
  );

  const summary: StatsSummary = {
    rowCount,
    columnCount: fields.length,
    columns: summaryColumns,
    strongCorrelations: strong,
    notableOutliers,
  };

  return {
    rowCount,
    columnCount: fields.length,
    columnTypes,
    columnKinds,
    numericStats,
    categoricalStats,
    columns,
    correlation,
    summary,
  };
}

function roundNumericSummary(s: NumericSummary): NumericSummary {
  return {
    ...s,
    missingPct: round2(s.missingPct),
    mean: round2(s.mean),
    median: round2(s.median),
    std: round2(s.std),
    min: round2(s.min),
    max: round2(s.max),
    q1: round2(s.q1),
    q3: round2(s.q3),
    skewness: s.skewness !== undefined ? round2(s.skewness) : undefined,
  };
}

export function round2(n: number): number {
  if (!Number.isFinite(n)) return n;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
