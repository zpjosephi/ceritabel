// lib/timeseries.ts
// Time-series analysis, computed in code. Builds an ordered series from a
// time column + a numeric value column, then reports trend, moving average,
// period-over-period change and lag-1 autocorrelation.

import { linearRegression, sampleCorrelation } from "simple-statistics";
import { isMissing, parseNumber } from "./stats";
import type { ParsedDataset } from "./types";

export interface TimePoint {
  label: string; // original time label
  value: number;
  ma: number | null; // moving average (null until window filled)
}

export interface TimeSeriesResult {
  timeCol: string;
  valueCol: string;
  n: number;
  startLabel: string;
  endLabel: string;
  points: TimePoint[];
  slopePerStep: number; // OLS slope vs observation index
  trend: "up" | "down" | "flat";
  r2: number;
  totalChange: number;
  totalChangePct: number | null;
  avgChange: number;
  autocorrLag1: number | null;
  maWindow: number;
}

/** Convert a time cell to a sortable number (epoch ms, or the numeric value). */
function timeKey(v: string): number | null {
  const num = parseNumber(v);
  if (num !== null && !/[-/:]/.test(v)) return num; // bare number (e.g. year)
  const parsed = Date.parse(v.trim());
  if (!Number.isNaN(parsed)) return parsed;
  return num; // fall back to numeric if any
}

export function analyzeTimeSeries(
  ds: ParsedDataset,
  timeCol: string,
  valueCol: string,
): TimeSeriesResult | null {
  // Collect (timeKey, label, value), averaging duplicate timestamps.
  const byTime = new Map<number, { label: string; sum: number; n: number }>();
  for (const row of ds.rows) {
    const tRaw = row[timeCol];
    const v = parseNumber(row[valueCol]);
    if (isMissing(tRaw) || v === null) continue;
    const label = (tRaw as string).trim();
    const k = timeKey(label);
    if (k === null) continue;
    const cur = byTime.get(k);
    if (cur) {
      cur.sum += v;
      cur.n += 1;
    } else {
      byTime.set(k, { label, sum: v, n: 1 });
    }
  }

  const sorted = [...byTime.entries()].sort((a, b) => a[0] - b[0]);
  const n = sorted.length;
  if (n < 3) return null;

  const values = sorted.map(([, g]) => g.sum / g.n);
  const labels = sorted.map(([, g]) => g.label);

  // Trend via OLS on the observation index (robust to irregular spacing).
  const reg = linearRegression(values.map((y, i) => [i, y]));
  const idx = values.map((_, i) => i);
  const r = sampleCorrelation(idx, values);
  const r2 = Number.isFinite(r) ? r * r : 0;
  const slope = reg.m;
  const scale =
    Math.max(...values) - Math.min(...values) || Math.abs(values[0]) || 1;
  const trend: "up" | "down" | "flat" =
    Math.abs(slope) < scale * 0.01 ? "flat" : slope > 0 ? "up" : "down";

  // Moving average.
  const maWindow = Math.max(2, Math.min(12, Math.floor(n / 8) || 2));
  const points: TimePoint[] = values.map((value, i) => {
    let ma: number | null = null;
    if (i >= maWindow - 1) {
      let s = 0;
      for (let j = i - maWindow + 1; j <= i; j++) s += values[j];
      ma = s / maWindow;
    }
    return { label: labels[i], value, ma };
  });

  // Period-over-period change.
  const diffs: number[] = [];
  for (let i = 1; i < n; i++) diffs.push(values[i] - values[i - 1]);
  const avgChange = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  const totalChange = values[n - 1] - values[0];
  const totalChangePct =
    values[0] !== 0 ? (totalChange / Math.abs(values[0])) * 100 : null;

  // Lag-1 autocorrelation.
  let autocorrLag1: number | null = null;
  if (n >= 3) {
    const a = values.slice(0, -1);
    const b = values.slice(1);
    const ac = sampleCorrelation(a, b);
    autocorrLag1 = Number.isFinite(ac) ? ac : null;
  }

  return {
    timeCol,
    valueCol,
    n,
    startLabel: labels[0],
    endLabel: labels[n - 1],
    points,
    slopePerStep: slope,
    trend,
    r2,
    totalChange,
    totalChangePct,
    avgChange,
    autocorrLag1,
    maWindow,
  };
}
