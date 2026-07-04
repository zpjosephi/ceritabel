// lib/cleaning.ts
// Deterministic cleaning operations (computed in code). Each op is a pure
// function: it takes a dataset + returns a NEW dataset and a human-readable
// change log entry. Operations are modelled as serialisable ACTIONS so the
// whole pipeline can be replayed from the original dataset - which gives us
// free, exact UNDO (just drop the last action and replay).

import { isMissing, parseNumber, quantileSorted, round2 } from "./stats";
import type { DataQualityReport } from "./dataQuality";
import type { ParsedDataset } from "./types";

export type MissingStrategy = "median" | "mean" | "mode" | "drop";

export type CleaningAction =
  | { op: "dropDuplicates" }
  | { op: "fillMissing"; column: string; strategy: MissingStrategy }
  | { op: "normalizeCategory"; column: string }
  | { op: "dropColumn"; column: string };

export interface CleaningChange {
  op: CleaningAction["op"];
  column?: string;
  description: string;
  meta: Record<string, unknown>;
}

export interface ApplyResult {
  dataset: ParsedDataset;
  change: CleaningChange | null; // null when the op was a no-op
}

const ROW_SEP = "";

function rowKey(ds: ParsedDataset, row: Record<string, string | null>): string {
  return ds.fields
    .map((f) => (isMissing(row[f]) ? "" : (row[f] as string).trim()))
    .join(ROW_SEP);
}

// --- individual operations -------------------------------------------------

export function dropDuplicates(ds: ParsedDataset): ApplyResult {
  const seen = new Set<string>();
  const rows: Record<string, string | null>[] = [];
  for (const row of ds.rows) {
    const key = rowKey(ds, row);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  const removed = ds.rows.length - rows.length;
  if (removed === 0) return { dataset: ds, change: null };
  return {
    dataset: { fields: ds.fields, rows },
    change: {
      op: "dropDuplicates",
      description: `Menghapus ${removed} baris duplikat.`,
      meta: { removed },
    },
  };
}

export function fillMissing(
  ds: ParsedDataset,
  column: string,
  strategy: MissingStrategy,
): ApplyResult {
  if (!ds.fields.includes(column)) return { dataset: ds, change: null };

  // Drop rows where this column is missing.
  if (strategy === "drop") {
    const rows = ds.rows.filter((r) => !isMissing(r[column]));
    const removed = ds.rows.length - rows.length;
    if (removed === 0) return { dataset: ds, change: null };
    return {
      dataset: { fields: ds.fields, rows },
      change: {
        op: "fillMissing",
        column,
        description: `Menghapus ${removed} baris yang kosong di "${column}".`,
        meta: { strategy, removed },
      },
    };
  }

  // Compute a fill value.
  let fillValue: string | null = null;
  if (strategy === "median" || strategy === "mean") {
    const nums = ds.rows
      .map((r) => parseNumber(r[column]))
      .filter((v): v is number => v !== null);
    if (nums.length === 0) return { dataset: ds, change: null };
    const value =
      strategy === "median"
        ? quantileSorted([...nums].sort((a, b) => a - b), 0.5)
        : nums.reduce((s, n) => s + n, 0) / nums.length;
    fillValue = String(round2(value));
  } else {
    // mode: most frequent non-missing value
    const freq = new Map<string, number>();
    for (const r of ds.rows) {
      if (isMissing(r[column])) continue;
      const v = (r[column] as string).trim();
      freq.set(v, (freq.get(v) ?? 0) + 1);
    }
    if (freq.size === 0) return { dataset: ds, change: null };
    fillValue = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  let filled = 0;
  const rows = ds.rows.map((r) => {
    if (isMissing(r[column])) {
      filled++;
      return { ...r, [column]: fillValue };
    }
    return r;
  });
  if (filled === 0) return { dataset: ds, change: null };

  const label =
    strategy === "median" ? "median" : strategy === "mean" ? "mean" : "modus";
  return {
    dataset: { fields: ds.fields, rows },
    change: {
      op: "fillMissing",
      column,
      description: `Mengisi ${filled} nilai kosong di "${column}" dengan ${label} (${fillValue}).`,
      meta: { strategy, value: fillValue, filled },
    },
  };
}

export function normalizeCategory(
  ds: ParsedDataset,
  column: string,
): ApplyResult {
  if (!ds.fields.includes(column)) return { dataset: ds, change: null };

  // For each normalised key, pick the most frequent raw variant as canonical.
  const groups = new Map<string, Map<string, number>>();
  for (const r of ds.rows) {
    if (isMissing(r[column])) continue;
    const value = (r[column] as string).trim();
    const key = value.toLowerCase();
    if (!groups.has(key)) groups.set(key, new Map());
    const inner = groups.get(key)!;
    inner.set(value, (inner.get(value) ?? 0) + 1);
  }
  const canonical = new Map<string, string>();
  let mergedGroups = 0;
  for (const [key, variants] of groups) {
    if (variants.size > 1) mergedGroups++;
    const best = [...variants.entries()].sort((a, b) => b[1] - a[1])[0][0];
    canonical.set(key, best);
  }

  let changed = 0;
  const rows = ds.rows.map((r) => {
    if (isMissing(r[column])) return r;
    const original = r[column] as string;
    const trimmed = original.trim();
    const target = canonical.get(trimmed.toLowerCase()) ?? trimmed;
    if (target !== original) {
      changed++;
      return { ...r, [column]: target };
    }
    return r;
  });

  if (changed === 0) return { dataset: ds, change: null };
  return {
    dataset: { fields: ds.fields, rows },
    change: {
      op: "normalizeCategory",
      column,
      description: `Merapikan ${changed} nilai di "${column}" (${mergedGroups} kelompok digabung/dirapikan).`,
      meta: { changed, mergedGroups },
    },
  };
}

export function dropColumn(ds: ParsedDataset, column: string): ApplyResult {
  if (!ds.fields.includes(column)) return { dataset: ds, change: null };
  const fields = ds.fields.filter((f) => f !== column);
  const rows = ds.rows.map((r) => {
    const copy = { ...r };
    delete copy[column];
    return copy;
  });
  return {
    dataset: { fields, rows },
    change: {
      op: "dropColumn",
      column,
      description: `Membuang kolom "${column}".`,
      meta: {},
    },
  };
}

// --- apply / replay --------------------------------------------------------

export function applyAction(
  ds: ParsedDataset,
  action: CleaningAction,
): ApplyResult {
  switch (action.op) {
    case "dropDuplicates":
      return dropDuplicates(ds);
    case "fillMissing":
      return fillMissing(ds, action.column, action.strategy);
    case "normalizeCategory":
      return normalizeCategory(ds, action.column);
    case "dropColumn":
      return dropColumn(ds, action.column);
  }
}

export interface ReplayResult {
  dataset: ParsedDataset;
  changes: CleaningChange[];
}

/** Replay a list of actions from the original dataset. */
export function replay(
  original: ParsedDataset,
  actions: CleaningAction[],
): ReplayResult {
  let dataset = original;
  const changes: CleaningChange[] = [];
  for (const action of actions) {
    const res = applyAction(dataset, action);
    dataset = res.dataset;
    if (res.change) changes.push(res.change);
  }
  return { dataset, changes };
}

/**
 * Deterministic "auto-clean" plan derived purely from the quality report
 * (no AI). Order matters: dedup → normalise → drop dead columns → fill missing.
 */
export function recommendedActions(report: DataQualityReport): CleaningAction[] {
  const actions: CleaningAction[] = [];
  const dropped = new Set<string>();

  if (report.duplicateRowCount > 0) actions.push({ op: "dropDuplicates" });

  for (const i of report.issues) {
    if (i.kind === "inconsistentCategory" && i.column) {
      actions.push({ op: "normalizeCategory", column: i.column });
    }
  }
  for (const i of report.issues) {
    if ((i.kind === "emptyColumn" || i.kind === "constantColumn") && i.column) {
      actions.push({ op: "dropColumn", column: i.column });
      dropped.add(i.column);
    }
  }
  for (const i of report.issues) {
    if (i.kind === "missing" && i.column && !dropped.has(i.column)) {
      const type = i.meta.type === "numeric" ? "median" : "mode";
      actions.push({
        op: "fillMissing",
        column: i.column,
        strategy: type as MissingStrategy,
      });
    }
  }
  return actions;
}
