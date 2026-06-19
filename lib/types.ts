// lib/types.ts
// The data contract. `StatsSummary` is the ONLY thing that crosses to the
// server — it contains computed statistics, never raw data rows.

export type ColumnType = "numeric" | "categorical";

/** Finer classification used for data-shape awareness & UI badges. */
export type ColumnKind = "numeric" | "categorical" | "datetime" | "boolean";

export interface NumericSummary {
  name: string;
  type: "numeric";
  count: number; // non-missing count
  missing: number;
  missingPct: number; // 0–100
  mean: number;
  median: number;
  std: number; // sample standard deviation (n-1)
  min: number;
  max: number;
  q1: number;
  q3: number;
  skewness?: number;
  outlierCount: number;
}

export interface CategoricalSummary {
  name: string;
  type: "categorical";
  count: number;
  missing: number;
  missingPct: number;
  uniqueCount: number;
  topCategories: { value: string; count: number; pct: number }[]; // top 5
}

export type ColumnSummary = NumericSummary | CategoricalSummary;

export interface CorrelationPair {
  a: string;
  b: string;
  r: number; // already rounded for display/transport
}

export interface StatsSummary {
  rowCount: number;
  columnCount: number;
  columns: ColumnSummary[];
  strongCorrelations: CorrelationPair[]; // |r| >= 0.5, sorted desc by |r|
  notableOutliers: { column: string; count: number; pct: number }[];
}

/** Shape of the AI response we ask the model to return (for clean rendering). */
export interface AIInsight {
  summary: string; // the data story, plain language
  findings: string[]; // notable findings
  suggestions: string[]; // exactly 3 follow-up suggestions
  /** Set when JSON parsing failed and we fell back to raw model text. */
  raw?: string;
}

// ---------------------------------------------------------------------------
// Internal types used by the client during analysis (NOT sent to the server).
// ---------------------------------------------------------------------------

/** A parsed dataset held in memory in the browser. */
export interface ParsedDataset {
  /** Column names in original order. */
  fields: string[];
  /** Rows as string|null cells, keyed by field name. */
  rows: Record<string, string | null>[];
}

/** Full correlation matrix kept client-side for the heatmap. */
export interface CorrelationMatrix {
  fields: string[]; // numeric column names, in order
  /** matrix[i][j] = Pearson r, or null when undefined. Diagonal = 1. */
  matrix: (number | null)[][];
}

/** Histogram bin computed in code, fed straight to the chart. */
export interface HistogramBin {
  /** Inclusive lower edge. */
  x0: number;
  /** Exclusive upper edge (inclusive for the last bin). */
  x1: number;
  count: number;
  /** Human-readable label for the bin range. */
  label: string;
}

/** Simple linear regression result (optional feature). */
export interface RegressionResult {
  xField: string;
  yField: string;
  slope: number; // m
  intercept: number; // b
  r2: number;
  n: number;
}
