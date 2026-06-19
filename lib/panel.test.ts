// lib/panel.test.ts
import { describe, it, expect } from "vitest";
import { analyzeDataset } from "./stats";
import { detectPanel, computePanel } from "./panel";
import type { ParsedDataset } from "./types";

// 3 entities × 3 years, balanced. gdp grows over time (within variation),
// and differs by country (between variation).
const panelDs: ParsedDataset = {
  fields: ["country", "year", "gdp"],
  rows: [
    { country: "ID", year: "2020", gdp: "100" },
    { country: "ID", year: "2021", gdp: "110" },
    { country: "ID", year: "2022", gdp: "120" },
    { country: "MY", year: "2020", gdp: "200" },
    { country: "MY", year: "2021", gdp: "210" },
    { country: "MY", year: "2022", gdp: "220" },
    { country: "SG", year: "2020", gdp: "300" },
    { country: "SG", year: "2021", gdp: "310" },
    { country: "SG", year: "2022", gdp: "320" },
  ],
};

describe("panel detection", () => {
  it("detects country as entity and year as time", () => {
    const det = detectPanel(panelDs, analyzeDataset(panelDs));
    expect(det).not.toBeNull();
    expect(det!.entityCol).toBe("country");
    expect(det!.timeCol).toBe("year");
  });

  it("returns null for non-panel data", () => {
    const flat: ParsedDataset = {
      fields: ["x", "y"],
      rows: [
        { x: "1", y: "a" },
        { x: "2", y: "b" },
        { x: "3", y: "c" },
      ],
    };
    expect(detectPanel(flat, analyzeDataset(flat))).toBeNull();
  });
});

describe("panel summary & decomposition", () => {
  const r = computePanel(panelDs, analyzeDataset(panelDs), "country", "year");

  it("reports a balanced 3×3 panel", () => {
    expect(r.nEntities).toBe(3);
    expect(r.nPeriods).toBe(3);
    expect(r.nObs).toBe(9);
    expect(r.balanced).toBe(true);
    expect(r.completenessPct).toBeCloseTo(100, 6);
  });

  it("decomposes gdp variance: between ≫ within", () => {
    const gdp = r.decomposition.find((d) => d.column === "gdp")!;
    expect(gdp.nObs).toBe(9);
    // entity means are 110, 210, 310 → large between SD (sample, = 100)
    expect(gdp.betweenSd).toBeCloseTo(100, 0);
    // within transform over all 9 obs (df = N·T−1 = 8): sqrt(600/8) ≈ 8.66
    expect(gdp.withinSd).toBeCloseTo(8.66, 1);
    expect(gdp.betweenSd).toBeGreaterThan(gdp.withinSd);
  });
});
