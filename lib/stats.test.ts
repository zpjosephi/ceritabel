// lib/stats.test.ts
// Small tests with hand-computed values, proving the statistics are correct.
// Run with: npm test

import { describe, it, expect } from "vitest";
import {
  isMissing,
  parseNumber,
  detectColumnType,
  detectColumnKind,
  quantileSorted,
  summarizeNumeric,
  summarizeCategorical,
  pearsonPairwise,
  simpleLinearRegression,
  histogramBins,
  analyzeDataset,
} from "./stats";

describe("missing tokens & number parsing", () => {
  it("treats blanks and sentinel tokens as missing (case-insensitive)", () => {
    for (const t of ["", "  ", "NA", "n/a", "NULL", "NaN", "-", "?"]) {
      expect(isMissing(t)).toBe(true);
    }
    expect(isMissing("0")).toBe(false);
    expect(isMissing("hello")).toBe(false);
  });

  it("parses finite numbers, rejects junk", () => {
    expect(parseNumber("3.5")).toBe(3.5);
    expect(parseNumber(" 42 ")).toBe(42);
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("NA")).toBeNull();
    expect(parseNumber("Infinity")).toBeNull();
  });

  it("tolerates currency, thousands separators and percent", () => {
    expect(parseNumber("$1,200")).toBe(1200);
    expect(parseNumber("Rp 1500")).toBe(1500);
    expect(parseNumber("1,000,000")).toBe(1000000);
    expect(parseNumber("5%")).toBe(5);
  });
});

describe("column kind detection", () => {
  it("detects datetime columns", () => {
    expect(
      detectColumnKind(["2020-01-01", "2020-02-01", "2020-03-15"]),
    ).toBe("datetime");
  });
  it("keeps bare years numeric (not datetime)", () => {
    expect(detectColumnKind(["2019", "2020", "2021"])).toBe("numeric");
  });
  it("detects boolean columns", () => {
    expect(detectColumnKind(["yes", "no", "yes", "no"])).toBe("boolean");
    expect(detectColumnKind(["true", "false"])).toBe("boolean");
  });
  it("currency strings → numeric", () => {
    expect(detectColumnKind(["$10", "$20", "$30"])).toBe("numeric");
  });
  it("free text → categorical", () => {
    expect(detectColumnKind(["red", "green", "blue"])).toBe("categorical");
  });
});

describe("column type detection (80% rule)", () => {
  it("numeric when >= 80% parse as numbers", () => {
    expect(detectColumnType(["1", "2", "3", "4", "x"])).toBe("numeric"); // 80%
    expect(detectColumnType(["1", "2", "3", "x", "y"])).toBe("categorical"); // 60%
  });
  it("ignores missing values in the ratio", () => {
    expect(detectColumnType(["1", "2", "NA", "3", ""])).toBe("numeric");
  });
  it("all-missing → categorical (no crash)", () => {
    expect(detectColumnType(["", "NA", null])).toBe("categorical");
  });
});

describe("quantiles (type-7 / R-7)", () => {
  it("matches known interpolated quantiles", () => {
    const s = [1, 2, 3, 4]; // sorted
    expect(quantileSorted(s, 0.5)).toBe(2.5); // median
    expect(quantileSorted(s, 0.25)).toBeCloseTo(1.75, 10);
    expect(quantileSorted(s, 0.75)).toBeCloseTo(3.25, 10);
  });
});

describe("numeric summary", () => {
  // Known dataset: 1..10
  const vals = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  const s = summarizeNumeric("x", vals);

  it("count / mean / median / min / max", () => {
    expect(s.count).toBe(10);
    expect(s.mean).toBeCloseTo(5.5, 10);
    expect(s.median).toBeCloseTo(5.5, 10);
    expect(s.min).toBe(1);
    expect(s.max).toBe(10);
  });

  it("sample std (n-1) of 1..10 is ~3.0277", () => {
    expect(s.std).toBeCloseTo(3.0276503540974917, 6);
  });

  it("quartiles via type-7: Q1=3.25, Q3=7.75", () => {
    expect(s.q1).toBeCloseTo(3.25, 10);
    expect(s.q3).toBeCloseTo(7.75, 10);
  });

  it("missing counted correctly", () => {
    const m = summarizeNumeric("x", ["1", "2", "NA", "", "5"]);
    expect(m.count).toBe(3);
    expect(m.missing).toBe(2);
    expect(m.missingPct).toBeCloseTo(40, 10);
  });
});

describe("outliers (IQR, 1.5x fence)", () => {
  it("flags a clear outlier", () => {
    // 1..10 with a 100 appended; Q1/Q3 shift but 100 is well beyond upper fence
    const s = summarizeNumeric("x", ["1", "2", "3", "4", "5", "100"]);
    expect(s.outlierCount).toBe(1);
    expect(s.outlierExamples).toContain(100);
  });
  it("constant column (IQR=0) → 0 outliers, no crash", () => {
    const s = summarizeNumeric("x", ["5", "5", "5", "5"]);
    expect(s.outlierCount).toBe(0);
    expect(s.std).toBe(0);
  });
});

describe("categorical summary", () => {
  it("counts uniques and top categories with pct", () => {
    const s = summarizeCategorical("c", ["a", "a", "b", "c", "a", "b", ""]);
    expect(s.count).toBe(6);
    expect(s.missing).toBe(1);
    expect(s.uniqueCount).toBe(3);
    expect(s.topCategories[0]).toEqual({ value: "a", count: 3, pct: 50 });
    expect(s.topCategories[1].value).toBe("b");
  });
});

describe("Pearson correlation", () => {
  it("perfect positive linear relation = 1", () => {
    const r = pearsonPairwise([1, 2, 3, 4], [2, 4, 6, 8]);
    expect(r).toBeCloseTo(1, 10);
  });
  it("perfect negative = -1", () => {
    const r = pearsonPairwise([1, 2, 3, 4], [8, 6, 4, 2]);
    expect(r).toBeCloseTo(-1, 10);
  });
  it("pairwise complete: ignores rows with a missing value", () => {
    const r = pearsonPairwise([1, 2, null, 4], [2, 4, 6, 8]);
    expect(r).toBeCloseTo(1, 10);
  });
  it("zero variance → null", () => {
    expect(pearsonPairwise([5, 5, 5, 5], [1, 2, 3, 4])).toBeNull();
  });
  it("n < 3 → null", () => {
    expect(pearsonPairwise([1, 2], [2, 4])).toBeNull();
  });
});

describe("simple linear regression", () => {
  it("recovers slope and intercept of y = 2x + 1", () => {
    const reg = simpleLinearRegression(
      "x",
      "y",
      [1, 2, 3, 4, 5],
      [3, 5, 7, 9, 11],
    );
    expect(reg).not.toBeNull();
    expect(reg!.slope).toBeCloseTo(2, 10);
    expect(reg!.intercept).toBeCloseTo(1, 10);
    expect(reg!.r2).toBeCloseTo(1, 10);
    expect(reg!.n).toBe(5);
  });
});

describe("histogram bins", () => {
  it("bin counts sum to the number of values", () => {
    const vals = Array.from({ length: 100 }, (_, i) => String(i));
    const bins = histogramBins(vals);
    const total = bins.reduce((acc, b) => acc + b.count, 0);
    expect(total).toBe(100);
    expect(bins.length).toBeGreaterThanOrEqual(5);
  });
  it("constant column → single bin", () => {
    const bins = histogramBins(["7", "7", "7"]);
    expect(bins.length).toBe(1);
    expect(bins[0].count).toBe(3);
  });
});

describe("analyzeDataset end-to-end", () => {
  it("builds a StatsSummary with correct types and correlations", () => {
    const ds = {
      fields: ["age", "score", "city"],
      rows: [
        { age: "20", score: "40", city: "A" },
        { age: "30", score: "60", city: "B" },
        { age: "40", score: "80", city: "A" },
        { age: "50", score: "100", city: "C" },
      ],
    };
    const a = analyzeDataset(ds);
    expect(a.rowCount).toBe(4);
    expect(a.columnCount).toBe(3);
    expect(a.columnTypes.age).toBe("numeric");
    expect(a.columnTypes.city).toBe("categorical");
    // age and score are perfectly correlated (score = 2*age)
    const pair = a.summary.strongCorrelations.find(
      (p) =>
        (p.a === "age" && p.b === "score") ||
        (p.a === "score" && p.b === "age"),
    );
    expect(pair).toBeDefined();
    expect(pair!.r).toBeCloseTo(1, 2);
  });
});
