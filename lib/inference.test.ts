// lib/inference.test.ts
// p-values verified against R (t.test / aov / chisq.test / cor.test).

import { describe, it, expect } from "vitest";
import {
  studentTTwoTailed,
  invStudentT,
  fUpperTail,
  chiSquareUpperTail,
  twoSampleTTest,
  oneWayAnova,
  chiSquareTest,
  correlationSignificance,
  runHypothesisTest,
} from "./inference";

describe("distribution tails", () => {
  it("t two-tailed: p(0)=1, and 2*pt(-2,8)≈0.0805", () => {
    expect(studentTTwoTailed(0, 8)).toBeCloseTo(1, 6);
    expect(studentTTwoTailed(2, 8)).toBeCloseTo(0.0805, 3);
  });
  it("inverse-t: qt(0.975, 8) ≈ 2.306", () => {
    expect(invStudentT(0.975, 8)).toBeCloseTo(2.306, 2);
  });
  it("F & chi-square upper tails at 0 are 1", () => {
    expect(fUpperTail(0, 2, 6)).toBe(1);
    expect(chiSquareUpperTail(0, 3)).toBe(1);
  });
});

describe("Welch two-sample t-test (R: t.test)", () => {
  // g1 = 1..5, g2 = 3..7  →  t = -2, df = 8, p ≈ 0.0805
  const r = twoSampleTTest(
    [1, 2, 3, 4, 5],
    [3, 4, 5, 6, 7],
    "y",
    "g",
    "A",
    "B",
  );
  it("t, df, p", () => {
    expect(r.t).toBeCloseTo(-2, 6);
    expect(r.df).toBeCloseTo(8, 6);
    expect(r.pValue).toBeCloseTo(0.0805, 3);
  });
  it("Cohen's d ≈ -1.265", () => {
    expect(r.cohensD).toBeCloseTo(-1.2649, 3);
  });
});

describe("one-way ANOVA (R: aov)", () => {
  // means 2,3,4 → F = 3 on df (2, 6), p ≈ 0.1254, eta² = 0.5
  const r = oneWayAnova(
    [
      { label: "x", values: [1, 2, 3] },
      { label: "y", values: [2, 3, 4] },
      { label: "z", values: [3, 4, 5] },
    ],
    "v",
    "g",
  );
  it("F, df, p, eta²", () => {
    expect(r.fStat).toBeCloseTo(3, 6);
    expect(r.dfBetween).toBe(2);
    expect(r.dfWithin).toBe(6);
    expect(r.pValue).toBeCloseTo(0.1254, 3);
    expect(r.etaSquared).toBeCloseTo(0.5, 6);
  });
});

describe("chi-square test (R: chisq.test)", () => {
  // [[10,20],[20,10]] → chi2 = 6.6667, df = 1, p ≈ 0.00982, V ≈ 0.333
  const r = chiSquareTest(
    [
      [10, 20],
      [20, 10],
    ],
    "row",
    "col",
  );
  it("chi2, df, p, Cramér's V", () => {
    expect(r.chi2).toBeCloseTo(6.6667, 3);
    expect(r.df).toBe(1);
    expect(r.pValue).toBeCloseTo(0.00982, 4);
    expect(r.cramersV).toBeCloseTo(0.3333, 3);
  });
});

describe("correlation significance (R: cor.test)", () => {
  it("near-perfect positive correlation → tiny p", () => {
    const r = correlationSignificance(
      [1, 2, 3, 4, 5],
      [2, 4, 6, 8, 11],
      "x",
      "y",
    );
    expect(r.r).toBeGreaterThan(0.99);
    expect(r.pValue).toBeLessThan(0.001);
    expect(r.df).toBe(3);
  });
});

describe("runHypothesisTest dispatcher", () => {
  const ds = {
    fields: ["score", "group", "pass"],
    rows: [
      { score: "1", group: "A", pass: "yes" },
      { score: "2", group: "A", pass: "yes" },
      { score: "3", group: "B", pass: "no" },
      { score: "4", group: "B", pass: "no" },
      { score: "5", group: "A", pass: "yes" },
      { score: "6", group: "B", pass: "no" },
    ],
  };
  it("numeric × categorical(2) → t-test", () => {
    const r = runHypothesisTest(
      ds,
      { name: "score", type: "numeric" },
      { name: "group", type: "categorical" },
    );
    expect(r.kind).toBe("ttest");
  });
  it("categorical × categorical → chi-square", () => {
    const r = runHypothesisTest(
      ds,
      { name: "group", type: "categorical" },
      { name: "pass", type: "categorical" },
    );
    expect(r.kind).toBe("chisquare");
  });
});
