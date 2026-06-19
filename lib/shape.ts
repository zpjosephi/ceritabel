// lib/shape.ts
// Detect the overall SHAPE of a dataset so the app can adapt which analyses it
// offers: cross-sectional, time series, or panel. Heuristic (code) — the UI
// lets the user override.

import { detectPanel, findTimeColumn } from "./panel";
import type { FullAnalysis } from "./stats";
import type { ParsedDataset } from "./types";

export type DataShape = "cross-sectional" | "timeseries" | "panel";

export interface ShapeDetection {
  shape: DataShape;
  entityCol?: string; // panel
  timeCol?: string; // timeseries & panel
  confidence: "high" | "medium" | "low";
}

export function detectShape(
  ds: ParsedDataset,
  analysis: FullAnalysis,
): ShapeDetection {
  // 1. Panel: an (entity, time) grid.
  const panel = detectPanel(ds, analysis);
  if (panel) {
    return {
      shape: "panel",
      entityCol: panel.entityCol,
      timeCol: panel.timeCol,
      confidence: "high",
    };
  }

  // 2. Time series: a time column but no entity grid.
  const timeCol = findTimeColumn(ds);
  if (timeCol) {
    return { shape: "timeseries", timeCol, confidence: "medium" };
  }

  // 3. Otherwise cross-sectional.
  return { shape: "cross-sectional", confidence: "high" };
}
