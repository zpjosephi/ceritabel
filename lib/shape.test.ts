// lib/shape.test.ts
import { describe, it, expect } from "vitest";
import { analyzeDataset } from "./stats";
import { detectShape } from "./shape";
import { analyzeTimeSeries } from "./timeseries";
import type { ParsedDataset } from "./types";

const tsDs: ParsedDataset = {
  fields: ["month", "sales"],
  rows: [
    { month: "2021-01", sales: "100" },
    { month: "2021-02", sales: "120" },
    { month: "2021-03", sales: "130" },
    { month: "2021-04", sales: "150" },
    { month: "2021-05", sales: "170" },
    { month: "2021-06", sales: "190" },
  ],
};

const panelDs: ParsedDataset = {
  fields: ["country", "year", "gdp"],
  rows: [
    { country: "A", year: "2020", gdp: "1" },
    { country: "A", year: "2021", gdp: "2" },
    { country: "B", year: "2020", gdp: "3" },
    { country: "B", year: "2021", gdp: "4" },
  ],
};

const crossDs: ParsedDataset = {
  fields: ["age", "city"],
  rows: [
    { age: "20", city: "X" },
    { age: "30", city: "Y" },
    { age: "40", city: "Z" },
  ],
};

describe("detectShape", () => {
  it("flags a time series", () => {
    expect(detectShape(tsDs, analyzeDataset(tsDs)).shape).toBe("timeseries");
  });
  it("flags a panel", () => {
    expect(detectShape(panelDs, analyzeDataset(panelDs)).shape).toBe("panel");
  });
  it("flags cross-sectional data", () => {
    expect(detectShape(crossDs, analyzeDataset(crossDs)).shape).toBe(
      "cross-sectional",
    );
  });
});

describe("analyzeTimeSeries", () => {
  const r = analyzeTimeSeries(tsDs, "month", "sales")!;
  it("builds an ordered series with an upward trend", () => {
    expect(r).not.toBeNull();
    expect(r.n).toBe(6);
    expect(r.trend).toBe("up");
    expect(r.slopePerStep).toBeGreaterThan(0);
    expect(r.totalChange).toBe(90); // 190 - 100
    expect(r.points[0].label).toBe("2021-01");
  });
  it("computes lag-1 autocorrelation", () => {
    expect(r.autocorrLag1).not.toBeNull();
    expect(r.autocorrLag1!).toBeGreaterThan(0.9); // smooth rising series
  });
});
