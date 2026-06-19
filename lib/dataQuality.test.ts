// lib/dataQuality.test.ts
import { describe, it, expect } from "vitest";
import { analyzeDataset } from "./stats";
import { scanDataQuality, type DataQualityReport } from "./dataQuality";

function report(ds: Parameters<typeof analyzeDataset>[0]): DataQualityReport {
  return scanDataQuality(ds, analyzeDataset(ds));
}

describe("data quality scan", () => {
  it("detects duplicate rows", () => {
    const r = report({
      fields: ["a", "b"],
      rows: [
        { a: "1", b: "x" },
        { a: "1", b: "x" }, // duplicate
        { a: "2", b: "y" },
      ],
    });
    expect(r.duplicateRowCount).toBe(1);
    expect(r.issues.some((i) => i.kind === "duplicateRows")).toBe(true);
  });

  it("detects missing values with severity by pct", () => {
    const r = report({
      fields: ["score"],
      rows: [
        { score: "10" },
        { score: "" },
        { score: "NA" },
        { score: "20" },
      ],
    });
    const issue = r.issues.find((i) => i.kind === "missing");
    expect(issue).toBeDefined();
    expect(issue!.column).toBe("score");
  });

  it("detects a constant column", () => {
    const r = report({
      fields: ["k"],
      rows: [{ k: "5" }, { k: "5" }, { k: "5" }],
    });
    expect(r.issues.some((i) => i.kind === "constantColumn")).toBe(true);
  });

  it("detects inconsistent category casing/whitespace", () => {
    const r = report({
      fields: ["city"],
      rows: [
        { city: "Jakarta" },
        { city: "jakarta " },
        { city: "JAKARTA" },
        { city: "Bandung" },
      ],
    });
    const issue = r.issues.find((i) => i.kind === "inconsistentCategory");
    expect(issue).toBeDefined();
    expect(issue!.column).toBe("city");
  });

  it("clean data scores 100 with no issues", () => {
    const r = report({
      fields: ["a", "b"],
      rows: [
        { a: "1", b: "10" },
        { a: "2", b: "25" },
        { a: "3", b: "12" },
        { a: "4", b: "40" },
      ],
    });
    expect(r.issues.length).toBe(0);
    expect(r.score).toBe(100);
  });
});
