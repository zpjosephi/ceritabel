// lib/regression.test.ts
import { describe, it, expect } from "vitest";
import {
  ols,
  runRegression,
  fixedEffects,
  randomEffects,
  hausmanTest,
  classicalAssumptions,
} from "./regression";
import { simpleLinearRegression } from "./stats";
import { correlationSignificance as corrSig } from "./inference";

describe("OLS multiple regression", () => {
  it("recovers an exact plane y = 1 + 2*x1 + 3*x2", () => {
    const x1 = [1, 2, 3, 4, 5, 6, 2, 4];
    const x2 = [2, 1, 4, 3, 6, 1, 5, 2];
    const y = x1.map((v, i) => 1 + 2 * v + 3 * x2[i]);
    const r = ols(
      y,
      x1.map((v, i) => [v, x2[i]]),
      "y",
      ["x1", "x2"],
    );
    expect(r.kind).toBe("ols");
    if (r.kind !== "ols") return;
    expect(r.terms[0].coef).toBeCloseTo(1, 6); // intercept
    expect(r.terms[1].coef).toBeCloseTo(2, 6); // x1
    expect(r.terms[2].coef).toBeCloseTo(3, 6); // x2
    expect(r.r2).toBeCloseTo(1, 6);
  });

  it("single-predictor OLS matches simple regression + correlation p-value", () => {
    const x = [1, 2, 3, 4, 5, 6, 7];
    const y = [2, 4, 5, 4, 6, 7, 9];
    const r = ols(
      y,
      x.map((v) => [v]),
      "y",
      ["x"],
    );
    if (r.kind !== "ols") throw new Error("expected ols");
    const simple = simpleLinearRegression("x", "y", x, y);
    expect(r.terms[1].coef).toBeCloseTo(simple!.slope, 8);
    expect(r.terms[0].coef).toBeCloseTo(simple!.intercept, 8);
    // slope t-test p-value should equal the correlation significance p-value
    const cs = corrSig(x, y, "x", "y");
    expect(r.terms[1].p).toBeCloseTo(cs.pValue, 6);
  });

  it("flags collinear predictors", () => {
    const x1 = [1, 2, 3, 4, 5];
    const r = ols(
      [2, 3, 5, 4, 6],
      x1.map((v) => [v, v * 2]), // x2 = 2*x1 → singular
      "y",
      ["x1", "x2"],
    );
    expect(r.kind).toBe("error");
  });

  it("fixed effects recovers the within slope (pooled would not)", () => {
    // Entity A: y = 2x + 10; Entity B: y = 2x + 0, but at higher x.
    // Within-entity slope = 2 for both → FE coef must be 2.
    const ds = {
      fields: ["id", "x", "y"],
      rows: [
        { id: "A", x: "1", y: "12" },
        { id: "A", x: "2", y: "14" },
        { id: "A", x: "3", y: "16" },
        { id: "B", x: "4", y: "8" },
        { id: "B", x: "5", y: "10" },
        { id: "B", x: "6", y: "12" },
      ],
    };
    const fe = fixedEffects(ds, "y", ["x"], "id");
    expect(fe.kind).toBe("ols");
    if (fe.kind !== "ols") return;
    expect(fe.method).toBe("fe");
    expect(fe.terms[0].name).toBe("x");
    expect(fe.terms[0].coef).toBeCloseTo(2, 6);
    expect(fe.nEntities).toBe(2);
    // pooled OLS (ignoring entity) gives a different, biased slope (≈ -0.57)
    const pooled = runRegression(ds, "y", ["x"]);
    if (pooled.kind === "ols") {
      const xTerm = pooled.terms.find((t) => t.name === "x")!;
      expect(Math.abs(xTerm.coef - 2)).toBeGreaterThan(0.5);
    }
  });

  it("random effects + Hausman test run and are sane", () => {
    // 3 entities × 4 periods; within slope ≈ 2, between slope ≈ 12 (effects
    // correlated with x → Hausman should lean to FE).
    const mk = (id: string, xs: number[], ys: number[]) =>
      xs.map((x, i) => ({ id, x: String(x), y: String(ys[i]) }));
    const ds = {
      fields: ["id", "x", "y"],
      rows: [
        ...mk("A", [1, 2, 3, 4], [2, 4, 6, 9]),
        ...mk("B", [2, 3, 4, 5], [14, 16, 19, 20]),
        ...mk("C", [3, 4, 5, 6], [26, 29, 30, 32]),
      ],
    };
    const re = randomEffects(ds, "y", ["x"], "id");
    const fe = fixedEffects(ds, "y", ["x"], "id");
    expect(re.kind).toBe("ols");
    expect(fe.kind).toBe("ols");
    if (re.kind !== "ols" || fe.kind !== "ols") return;
    expect(re.method).toBe("re");
    const reX = re.terms.find((t) => t.name === "x")!;
    expect(Number.isFinite(reX.coef)).toBe(true);
    expect(reX.coef).toBeGreaterThan(0);

    // Hausman is undefined when Var(FE)−Var(RE) isn't positive-definite; when
    // it IS defined it must be a valid chi-square test on k df.
    const h = hausmanTest(fe, re);
    if (h !== null) {
      expect(h.df).toBe(1);
      expect(h.pValue).toBeGreaterThanOrEqual(0);
      expect(h.pValue).toBeLessThanOrEqual(1);
    }
  });

  it("classical assumptions: flags multicollinearity via high VIF", () => {
    // x2 ≈ 2*x1 → x1 & x2 highly collinear → VIF should be large.
    let seed = 3;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280), seed / 233280);
    const rows = Array.from({ length: 40 }, (_, i) => {
      const x1 = i + rnd();
      const x2 = 2 * x1 + (rnd() - 0.5) * 0.1;
      const y = 3 + 1.5 * x1 + 0.5 * x2 + (rnd() - 0.5) * 5;
      return { x1: String(x1), x2: String(x2), y: y.toFixed(3) };
    });
    const a = classicalAssumptions(
      { fields: ["x1", "x2", "y"], rows },
      "y",
      ["x1", "x2"],
    );
    expect(a.kind).toBe("assumptions");
    if (a.kind !== "assumptions") return;
    expect(a.vif.find((v) => v.name === "x1")!.vif).toBeGreaterThan(10);
    expect(a.normality.p).toBeGreaterThanOrEqual(0);
    expect(a.normality.p).toBeLessThanOrEqual(1);
    expect(a.durbinWatson).toBeGreaterThan(0);
    expect(a.durbinWatson).toBeLessThan(4);
    expect(a.hetero.p).toBeGreaterThanOrEqual(0);
  });

  it("runRegression builds from a dataset", () => {
    const ds = {
      fields: ["price", "size", "rooms"],
      rows: [
        { price: "100", size: "50", rooms: "2" },
        { price: "150", size: "70", rooms: "3" },
        { price: "200", size: "90", rooms: "3" },
        { price: "250", size: "110", rooms: "4" },
        { price: "300", size: "130", rooms: "5" },
      ],
    };
    const r = runRegression(ds, "price", ["size", "rooms"]);
    expect(r.kind).toBe("ols");
    if (r.kind === "ols") {
      expect(r.predictors).toEqual(["size", "rooms"]);
      expect(r.n).toBe(5);
    }
  });
});
