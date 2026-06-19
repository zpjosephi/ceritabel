// lib/dataQuality.ts
// Deterministic data-quality scan (computed in code — NOT by the LLM).
// Produces a structured report of issues that (a) renders in the UI and
// (b) feeds the cleaning operations (Fase C) and the AI advisor (Fase D).

import { isMissing } from "./stats";
import type { FullAnalysis } from "./stats";
import type { ParsedDataset } from "./types";

export type IssueSeverity = "high" | "medium" | "low";

export type IssueKind =
  | "missing"
  | "duplicateRows"
  | "constantColumn"
  | "emptyColumn"
  | "inconsistentCategory"
  | "idLike"
  | "outliers";

export interface DataQualityIssue {
  id: string;
  kind: IssueKind;
  column?: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  /** Machine-readable specifics used by cleaning + the AI advisor. */
  meta: Record<string, unknown>;
}

export interface DataQualityReport {
  rowCount: number;
  columnCount: number;
  duplicateRowCount: number;
  totalMissing: number;
  totalCells: number;
  missingPct: number;
  issues: DataQualityIssue[];
  /** 0–100 — higher is cleaner. */
  score: number;
}

const SEVERITY_PENALTY: Record<IssueSeverity, number> = {
  high: 12,
  medium: 6,
  low: 2,
};

/** Normalised key for category-variant detection: trimmed + lower-cased. */
function normKey(v: string): string {
  return v.trim().toLowerCase();
}

export function scanDataQuality(
  ds: ParsedDataset,
  analysis: FullAnalysis,
): DataQualityReport {
  const { fields, rows } = ds;
  const rowCount = rows.length;
  const columnCount = fields.length;
  const issues: DataQualityIssue[] = [];

  // --- 1. Duplicate rows (exact, after trimming + missing-normalisation) ---
  const rowKeyCount = new Map<string, number>();
  for (const row of rows) {
    const key = fields
      .map((f) => (isMissing(row[f]) ? "" : (row[f] as string).trim()))
      .join("");
    rowKeyCount.set(key, (rowKeyCount.get(key) ?? 0) + 1);
  }
  let duplicateRowCount = 0;
  for (const c of rowKeyCount.values()) if (c > 1) duplicateRowCount += c - 1;
  if (duplicateRowCount > 0) {
    const pct = rowCount > 0 ? (duplicateRowCount / rowCount) * 100 : 0;
    issues.push({
      id: "duplicate-rows",
      kind: "duplicateRows",
      severity: pct >= 10 ? "high" : "medium",
      title: "Baris duplikat",
      detail: `${duplicateRowCount} baris identik (${pct.toFixed(1)}% dari data).`,
      meta: { count: duplicateRowCount, pct },
    });
  }

  // --- per-column checks ---
  let totalMissing = 0;
  for (const col of analysis.columns) {
    totalMissing += col.missing;

    // 2. Empty column (all missing)
    if (col.count === 0) {
      issues.push({
        id: `empty-${col.name}`,
        kind: "emptyColumn",
        column: col.name,
        severity: "high",
        title: "Kolom kosong total",
        detail: `Kolom "${col.name}" tidak punya nilai sama sekali.`,
        meta: {},
      });
      continue; // no further checks make sense
    }

    // 3. Missing values
    if (col.missing > 0) {
      const sev: IssueSeverity =
        col.missingPct >= 40 ? "high" : col.missingPct >= 10 ? "medium" : "low";
      issues.push({
        id: `missing-${col.name}`,
        kind: "missing",
        column: col.name,
        severity: sev,
        title: "Nilai kosong (missing)",
        detail: `Kolom "${col.name}": ${col.missing} kosong (${col.missingPct.toFixed(1)}%).`,
        meta: {
          missing: col.missing,
          missingPct: col.missingPct,
          type: col.type,
        },
      });
    }

    // 4. Constant column (no information)
    const isConstant =
      col.type === "numeric"
        ? col.std === 0
        : col.uniqueCount <= 1;
    if (isConstant && col.count > 0) {
      issues.push({
        id: `constant-${col.name}`,
        kind: "constantColumn",
        column: col.name,
        severity: "medium",
        title: "Kolom konstan",
        detail: `Kolom "${col.name}" isinya satu nilai saja — tidak menambah informasi.`,
        meta: {},
      });
    }

    // 5. ID-like column (all values unique, or name looks like an id)
    const looksLikeIdName = /(^|_|\s)id$/i.test(col.name) || /^id$/i.test(col.name);
    const allUnique =
      col.type === "categorical"
        ? col.uniqueCount === col.count && col.count >= 10
        : false;
    if ((looksLikeIdName || allUnique) && col.count > 0) {
      issues.push({
        id: `idlike-${col.name}`,
        kind: "idLike",
        column: col.name,
        severity: "low",
        title: "Kemungkinan kolom ID",
        detail: `Kolom "${col.name}" terlihat seperti pengenal unik — biasanya tidak dipakai untuk analisis statistik.`,
        meta: { allUnique, looksLikeIdName },
      });
    }
  }

  // 6. Inconsistent categories (same value with different case/whitespace)
  for (const cat of analysis.categoricalStats) {
    const variants = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const raw = row[cat.name];
      if (isMissing(raw)) continue;
      const value = (raw as string).trim();
      const key = normKey(value);
      if (!variants.has(key)) variants.set(key, new Map());
      const inner = variants.get(key)!;
      inner.set(value, (inner.get(value) ?? 0) + 1);
    }
    const messy = [...variants.entries()].filter(([, m]) => m.size > 1);
    if (messy.length > 0) {
      const examples = messy
        .slice(0, 3)
        .map(([, m]) => [...m.keys()].join(" / "));
      issues.push({
        id: `inconsistent-${cat.name}`,
        kind: "inconsistentCategory",
        column: cat.name,
        severity: messy.length >= 3 ? "medium" : "low",
        title: "Kategori tidak konsisten",
        detail: `Kolom "${cat.name}": ${messy.length} kelompok nilai sama tapi beda penulisan (mis. ${examples[0]}).`,
        meta: { groups: messy.length, examples },
      });
    }
  }

  // 7. Outliers (already computed in stats)
  for (const ns of analysis.numericStats) {
    if (ns.outlierCount > 0) {
      const pct = ns.count > 0 ? (ns.outlierCount / ns.count) * 100 : 0;
      issues.push({
        id: `outliers-${ns.name}`,
        kind: "outliers",
        column: ns.name,
        severity: pct >= 10 ? "medium" : "low",
        title: "Outlier (nilai ekstrem)",
        detail: `Kolom "${ns.name}": ${ns.outlierCount} outlier (${pct.toFixed(1)}%) menurut metode IQR.`,
        meta: { count: ns.outlierCount, pct },
      });
    }
  }

  // --- score ---
  const totalPenalty = issues.reduce(
    (acc, i) => acc + SEVERITY_PENALTY[i.severity],
    0,
  );
  const score = Math.max(0, Math.min(100, 100 - totalPenalty));

  const totalCells = rowCount * columnCount;
  const missingPct = totalCells > 0 ? (totalMissing / totalCells) * 100 : 0;

  // Sort issues: severity desc, then by kind for stable display.
  const order: Record<IssueSeverity, number> = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    rowCount,
    columnCount,
    duplicateRowCount,
    totalMissing,
    totalCells,
    missingPct,
    issues,
    score,
  };
}
