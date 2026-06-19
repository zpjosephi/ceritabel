// lib/regression.ts
// Multiple linear regression (OLS), computed in code. Produces the full
// summary: per-coefficient t-tests (partial significance), the overall F-test
// (joint significance), R² and adjusted R² — like summary(lm(y ~ ., df)) in R.
// Verified against R in regression.test.ts.

import { isMissing, parseNumber } from "./stats";
import { studentTTwoTailed, fUpperTail, chiSquareUpperTail } from "./inference";
import type { ParsedDataset } from "./types";

export interface RegressionTerm {
  name: string; // "(Intercept)" or predictor name
  coef: number;
  se: number;
  t: number;
  p: number;
}

export interface OlsResult {
  kind: "ols";
  method: "pooled" | "fe" | "re";
  y: string;
  predictors: string[];
  terms: RegressionTerm[]; // intercept first (pooled), then predictors
  n: number;
  k: number; // number of parameters (incl. intercept for pooled)
  r2: number; // within-R² for FE
  adjR2: number;
  fStat: number;
  fDf1: number;
  fDf2: number;
  fPValue: number;
  sigma: number; // residual standard error
  entityCol?: string; // FE / RE
  nEntities?: number; // FE / RE
  theta?: number; // RE quasi-demeaning factor (avg)
  /** Slope estimates & their covariance (predictors only) — used by Hausman. */
  slopeBeta?: number[];
  slopeVcov?: number[][];
}

export interface HausmanResult {
  stat: number;
  df: number;
  pValue: number;
  prefer: "fe" | "re";
}

export interface AssumptionResult {
  kind: "assumptions";
  n: number;
  /** Normality of residuals (Jarque–Bera). */
  normality: { jb: number; df: number; p: number; ok: boolean };
  /** Multicollinearity: VIF per predictor (>10 = problematic). */
  vif: { name: string; vif: number }[];
  /** Heteroscedasticity (Breusch–Pagan / Koenker LM). */
  hetero: { bp: number; df: number; p: number; ok: boolean };
  /** Autocorrelation of residuals (Durbin–Watson, ~2 = none). */
  durbinWatson: number;
}

export interface RegressionError {
  kind: "error";
  message: string;
}

// --- small linear algebra ---------------------------------------------------

function transpose(A: number[][]): number[][] {
  const r = A.length;
  const c = A[0].length;
  const T: number[][] = Array.from({ length: c }, () => Array(r).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) T[j][i] = A[i][j];
  return T;
}

function matmul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const m = B[0].length;
  const p = B.length;
  const C: number[][] = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++)
    for (let k = 0; k < p; k++) {
      const a = A[i][k];
      for (let j = 0; j < m; j++) C[i][j] += a * B[k][j];
    }
  return C;
}

function matvec(A: number[][], v: number[]): number[] {
  return A.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
}

/** Inverse of a square matrix via Gauss-Jordan; null if (near-)singular. */
function inverse(A: number[][]): number[][] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...row.map((_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    // partial pivot
    let piv = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) return null; // singular / collinear
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let j = 0; j < 2 * n; j++) M[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map((row) => row.slice(n));
}

// --- OLS --------------------------------------------------------------------

export function ols(
  y: number[],
  X: number[][], // n × p (without intercept), columns = predictors
  yName: string,
  predictorNames: string[],
): OlsResult | RegressionError {
  const n = y.length;
  const p = predictorNames.length;
  const k = p + 1; // + intercept
  if (n <= k) {
    return {
      kind: "error",
      message: "Data terlalu sedikit untuk jumlah variabel (butuh n > variabel + 1).",
    };
  }

  // design matrix with leading intercept column of 1s
  const Xd = X.map((row) => [1, ...row]);
  const Xt = transpose(Xd);
  const XtX = matmul(Xt, Xd);
  const XtXinv = inverse(XtX);
  if (!XtXinv) {
    return {
      kind: "error",
      message: "Variabel saling kolinear (matriks singular). Buang salah satu variabel yang sangat mirip.",
    };
  }
  const Xty = matvec(Xt, y);
  const beta = matvec(XtXinv, Xty);

  // residuals & variance
  const fitted = matvec(Xd, beta);
  const resid = y.map((yi, i) => yi - fitted[i]);
  const sse = resid.reduce((s, e) => s + e * e, 0);
  const dfResid = n - k;
  const sigma2 = sse / dfResid;
  const sigma = Math.sqrt(sigma2);

  const ybar = y.reduce((s, v) => s + v, 0) / n;
  const sst = y.reduce((s, v) => s + (v - ybar) ** 2, 0);
  const r2 = sst > 0 ? 1 - sse / sst : 0;
  const adjR2 = 1 - (1 - r2) * ((n - 1) / dfResid);

  const names = ["(Intercept)", ...predictorNames];
  const terms: RegressionTerm[] = beta.map((b, j) => {
    const se = Math.sqrt(Math.max(0, sigma2 * XtXinv[j][j]));
    const tStat = se > 0 ? b / se : NaN;
    const pVal = se > 0 ? studentTTwoTailed(tStat, dfResid) : NaN;
    return { name: names[j], coef: b, se, t: tStat, p: pVal };
  });

  // overall F-test (joint significance of all predictors)
  const fDf1 = p;
  const fDf2 = dfResid;
  const fStat = (r2 / p) / ((1 - r2) / dfResid);
  const fPValue = Number.isFinite(fStat) ? fUpperTail(fStat, fDf1, fDf2) : NaN;

  return {
    kind: "ols",
    method: "pooled",
    y: yName,
    predictors: predictorNames,
    terms,
    n,
    k,
    r2,
    adjR2,
    fStat,
    fDf1,
    fDf2,
    fPValue,
    sigma,
  };
}

/**
 * Fixed-effects (within) regression: demean Y and X by entity, then OLS with no
 * intercept. Coefficients show the effect of X on Y *within* an entity over
 * time — controlling for stable per-entity differences.
 */
export function fixedEffects(
  ds: ParsedDataset,
  yName: string,
  xNames: string[],
  entityCol: string,
): OlsResult | RegressionError {
  const predictors = xNames.filter((x) => x !== yName && x !== entityCol);
  if (predictors.length === 0) {
    return { kind: "error", message: "Pilih minimal satu variabel prediktor (X)." };
  }

  // complete cases with an entity label
  const ent: string[] = [];
  const yRaw: number[] = [];
  const xRaw: number[][] = [];
  for (const row of ds.rows) {
    const e = row[entityCol];
    if (isMissing(e)) continue;
    const yv = parseNumber(row[yName]);
    if (yv === null) continue;
    const xs = predictors.map((p) => parseNumber(row[p]));
    if (xs.some((v) => v === null)) continue;
    ent.push((e as string).trim());
    yRaw.push(yv);
    xRaw.push(xs as number[]);
  }
  const n = yRaw.length;
  const p = predictors.length;
  if (n === 0) return { kind: "error", message: "Tidak ada baris lengkap untuk regresi." };

  // entity means for y and each x
  const sums = new Map<string, { y: number; x: number[]; c: number }>();
  for (let i = 0; i < n; i++) {
    let g = sums.get(ent[i]);
    if (!g) {
      g = { y: 0, x: Array(p).fill(0), c: 0 };
      sums.set(ent[i], g);
    }
    g.y += yRaw[i];
    for (let j = 0; j < p; j++) g.x[j] += xRaw[i][j];
    g.c += 1;
  }
  const nEntities = sums.size;
  const k = p; // no intercept (absorbed by entity demeaning)
  const dfResid = n - nEntities - k;
  if (dfResid <= 0) {
    return {
      kind: "error",
      message: "Data terlalu sedikit untuk fixed effects (butuh banyak observasi per entitas).",
    };
  }

  // demean
  const yd: number[] = [];
  const Xd: number[][] = [];
  for (let i = 0; i < n; i++) {
    const g = sums.get(ent[i])!;
    yd.push(yRaw[i] - g.y / g.c);
    Xd.push(xRaw[i].map((v, j) => v - g.x[j] / g.c));
  }

  const Xt = transpose(Xd);
  const XtX = matmul(Xt, Xd);
  const XtXinv = inverse(XtX);
  if (!XtXinv) {
    return {
      kind: "error",
      message: "Variabel saling kolinear (matriks singular). Buang salah satu yang mirip.",
    };
  }
  const beta = matvec(XtXinv, matvec(Xt, yd));
  const fitted = matvec(Xd, beta);
  const resid = yd.map((v, i) => v - fitted[i]);
  const sse = resid.reduce((s, e) => s + e * e, 0);
  const sst = yd.reduce((s, v) => s + v * v, 0); // demeaned → mean 0
  const sigma2 = sse / dfResid;
  const sigma = Math.sqrt(sigma2);
  const r2 = sst > 0 ? 1 - sse / sst : 0; // within R²

  const terms: RegressionTerm[] = beta.map((b, j) => {
    const se = Math.sqrt(Math.max(0, sigma2 * XtXinv[j][j]));
    const tStat = se > 0 ? b / se : NaN;
    return {
      name: predictors[j],
      coef: b,
      se,
      t: tStat,
      p: se > 0 ? studentTTwoTailed(tStat, dfResid) : NaN,
    };
  });

  const fStat = (r2 / k) / ((1 - r2) / dfResid);
  const slopeVcov = XtXinv.map((row) => row.map((v) => v * sigma2));
  return {
    kind: "ols",
    method: "fe",
    y: yName,
    predictors,
    terms,
    n,
    k,
    r2,
    adjR2: 1 - (1 - r2) * ((n - 1) / dfResid),
    fStat,
    fDf1: k,
    fDf2: dfResid,
    fPValue: Number.isFinite(fStat) ? fUpperTail(fStat, k, dfResid) : NaN,
    sigma,
    entityCol,
    nEntities,
    slopeBeta: beta,
    slopeVcov,
  };
}

interface PanelData {
  ent: string[];
  y: number[];
  X: number[][];
  predictors: string[];
}

function gatherPanel(
  ds: ParsedDataset,
  yName: string,
  xNames: string[],
  entityCol: string,
): PanelData | RegressionError {
  const predictors = xNames.filter((x) => x !== yName && x !== entityCol);
  if (predictors.length === 0)
    return { kind: "error", message: "Pilih minimal satu variabel prediktor (X)." };
  const ent: string[] = [];
  const y: number[] = [];
  const X: number[][] = [];
  for (const row of ds.rows) {
    const e = row[entityCol];
    if (isMissing(e)) continue;
    const yv = parseNumber(row[yName]);
    if (yv === null) continue;
    const xs = predictors.map((p) => parseNumber(row[p]));
    if (xs.some((v) => v === null)) continue;
    ent.push((e as string).trim());
    y.push(yv);
    X.push(xs as number[]);
  }
  if (y.length === 0)
    return { kind: "error", message: "Tidak ada baris lengkap untuk regresi." };
  return { ent, y, X, predictors };
}

/**
 * Random-effects (one-way) regression via Swamy–Arora-style quasi-demeaning.
 * θ = 1 − sqrt(σ²_e / (σ²_e + T·σ²_u)); exact for balanced panels, approximate
 * (uses mean group size) for unbalanced ones.
 */
export function randomEffects(
  ds: ParsedDataset,
  yName: string,
  xNames: string[],
  entityCol: string,
): OlsResult | RegressionError {
  const fe = fixedEffects(ds, yName, xNames, entityCol);
  if (fe.kind !== "ols") return fe;
  const sigma2e = fe.sigma * fe.sigma;

  const panel = gatherPanel(ds, yName, xNames, entityCol);
  if ("kind" in panel && panel.kind === "error") return panel;
  const { ent, y, X, predictors } = panel as PanelData;
  const n = y.length;
  const p = predictors.length;

  // entity means & counts
  const grp = new Map<string, { y: number; x: number[]; c: number }>();
  for (let i = 0; i < n; i++) {
    let g = grp.get(ent[i]);
    if (!g) {
      g = { y: 0, x: Array(p).fill(0), c: 0 };
      grp.set(ent[i], g);
    }
    g.y += y[i];
    for (let j = 0; j < p; j++) g.x[j] += X[i][j];
    g.c += 1;
  }
  const nEntities = grp.size;

  // between regression on entity means → σ²_between
  const ybar: number[] = [];
  const Xbar: number[][] = [];
  for (const g of grp.values()) {
    ybar.push(g.y / g.c);
    Xbar.push(g.x.map((s) => s / g.c));
  }
  const between = ols(ybar, Xbar, yName, predictors);
  if (between.kind !== "ols") {
    return { kind: "error", message: "Entitas terlalu sedikit untuk random effects." };
  }
  const sigma2between = between.sigma * between.sigma;
  const Tbar = n / nEntities;
  const sigma2u = Math.max(0, sigma2between - sigma2e / Tbar);

  // quasi-demean (per-entity θ) and OLS with a (1−θ) intercept column
  const Xstar: number[][] = [];
  const ystar: number[] = [];
  let thetaSum = 0;
  for (let i = 0; i < n; i++) {
    const g = grp.get(ent[i])!;
    const Ti = g.c;
    const theta = 1 - Math.sqrt(sigma2e / (sigma2e + Ti * sigma2u));
    thetaSum += theta;
    const ybari = g.y / g.c;
    ystar.push(y[i] - theta * ybari);
    Xstar.push([1 - theta, ...X[i].map((v, j) => v - theta * (g.x[j] / g.c))]);
  }
  const Xt = transpose(Xstar);
  const XtXinv = inverse(matmul(Xt, Xstar));
  if (!XtXinv) return { kind: "error", message: "Matriks singular pada random effects." };
  const beta = matvec(XtXinv, matvec(Xt, ystar));
  const fitted = matvec(Xstar, beta);
  const resid = ystar.map((v, i) => v - fitted[i]);
  const sse = resid.reduce((s, e) => s + e * e, 0);
  const kParams = p + 1;
  const dfResid = n - kParams;
  const sigma2 = sse / dfResid;
  const sigma = Math.sqrt(sigma2);
  const ybarStar = ystar.reduce((s, v) => s + v, 0) / n;
  const sst = ystar.reduce((s, v) => s + (v - ybarStar) ** 2, 0);
  const r2 = sst > 0 ? 1 - sse / sst : 0;

  const names = ["(Intercept)", ...predictors];
  const terms: RegressionTerm[] = beta.map((b, j) => {
    const se = Math.sqrt(Math.max(0, sigma2 * XtXinv[j][j]));
    const tStat = se > 0 ? b / se : NaN;
    return { name: names[j], coef: b, se, t: tStat, p: se > 0 ? studentTTwoTailed(tStat, dfResid) : NaN };
  });

  const fStat = (r2 / p) / ((1 - r2) / dfResid);
  // slope-only beta & vcov (drop intercept) for Hausman
  const slopeBeta = beta.slice(1);
  const slopeVcov = XtXinv.slice(1).map((row) => row.slice(1).map((v) => v * sigma2));

  return {
    kind: "ols",
    method: "re",
    y: yName,
    predictors,
    terms,
    n,
    k: kParams,
    r2,
    adjR2: 1 - (1 - r2) * ((n - 1) / dfResid),
    fStat,
    fDf1: p,
    fDf2: dfResid,
    fPValue: Number.isFinite(fStat) ? fUpperTail(fStat, p, dfResid) : NaN,
    sigma,
    entityCol,
    nEntities,
    theta: thetaSum / n,
    slopeBeta,
    slopeVcov,
  };
}

/**
 * Classical OLS assumption tests ("uji asumsi klasik"):
 * normality (Jarque–Bera), multicollinearity (VIF), heteroscedasticity
 * (Breusch–Pagan/Koenker LM), and autocorrelation (Durbin–Watson).
 */
export function classicalAssumptions(
  ds: ParsedDataset,
  yName: string,
  xNames: string[],
): AssumptionResult | RegressionError {
  const predictors = xNames.filter((x) => x !== yName);
  if (predictors.length === 0)
    return { kind: "error", message: "Pilih minimal satu variabel prediktor (X)." };

  const y: number[] = [];
  const X: number[][] = [];
  for (const row of ds.rows) {
    const yv = parseNumber(row[yName]);
    if (yv === null) continue;
    const xs = predictors.map((p) => parseNumber(row[p]));
    if (xs.some((v) => v === null)) continue;
    y.push(yv);
    X.push(xs as number[]);
  }
  const n = y.length;
  const p = predictors.length;
  if (n <= p + 1) return { kind: "error", message: "Data terlalu sedikit untuk uji asumsi." };

  // main OLS fit → residuals
  const fit = ols(y, X, yName, predictors);
  if (fit.kind !== "ols") return fit;
  const b = fit.terms.map((t) => t.coef);
  const resid = y.map((yi, i) => {
    let pred = b[0];
    for (let j = 0; j < p; j++) pred += b[j + 1] * X[i][j];
    return yi - pred;
  });

  // --- normality: Jarque–Bera on residuals ---
  const mean = resid.reduce((s, e) => s + e, 0) / n;
  let m2 = 0,
    m3 = 0,
    m4 = 0;
  for (const e of resid) {
    const d = e - mean;
    m2 += d * d;
    m3 += d * d * d;
    m4 += d * d * d * d;
  }
  m2 /= n;
  m3 /= n;
  m4 /= n;
  const sd = Math.sqrt(m2);
  const S = sd > 0 ? m3 / sd ** 3 : 0;
  const K = sd > 0 ? m4 / sd ** 4 : 3;
  const jb = (n / 6) * (S * S + (K - 3) ** 2 / 4);
  const jbP = chiSquareUpperTail(jb, 2);

  // --- multicollinearity: VIF (regress each X on the others) ---
  const vif: { name: string; vif: number }[] = [];
  for (let j = 0; j < p; j++) {
    if (p < 2) {
      vif.push({ name: predictors[j], vif: 1 });
      continue;
    }
    const yj = X.map((row) => row[j]);
    const Xj = X.map((row) => row.filter((_, idx) => idx !== j));
    const aux = ols(yj, Xj, predictors[j], predictors.filter((_, idx) => idx !== j));
    const r2 = aux.kind === "ols" ? aux.r2 : 0;
    vif.push({ name: predictors[j], vif: r2 < 1 ? 1 / (1 - r2) : Infinity });
  }

  // --- heteroscedasticity: Breusch–Pagan (Koenker LM = n * R² of e² ~ X) ---
  const e2 = resid.map((e) => e * e);
  const aux = ols(e2, X, "e2", predictors);
  const bpR2 = aux.kind === "ols" ? aux.r2 : 0;
  const bp = n * bpR2;
  const bpP = chiSquareUpperTail(bp, p);

  // --- autocorrelation: Durbin–Watson ---
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    den += resid[i] * resid[i];
    if (i > 0) num += (resid[i] - resid[i - 1]) ** 2;
  }
  const dw = den > 0 ? num / den : NaN;

  return {
    kind: "assumptions",
    n,
    normality: { jb, df: 2, p: jbP, ok: jbP > 0.05 },
    vif,
    hetero: { bp, df: p, p: bpP, ok: bpP > 0.05 },
    durbinWatson: dw,
  };
}

/** Hausman test: FE vs RE. Significant → fixed effects preferred. */
export function hausmanTest(
  fe: OlsResult,
  re: OlsResult,
): HausmanResult | null {
  if (!fe.slopeBeta || !fe.slopeVcov || !re.slopeBeta || !re.slopeVcov) return null;
  const k = fe.slopeBeta.length;
  if (k === 0 || re.slopeBeta.length !== k) return null;
  const diff = fe.slopeBeta.map((b, i) => b - re.slopeBeta![i]);
  const Vdiff = fe.slopeVcov.map((row, i) =>
    row.map((v, j) => v - re.slopeVcov![i][j]),
  );
  const Vinv = inverse(Vdiff);
  if (!Vinv) return null;
  const tmp = matvec(Vinv, diff);
  const raw = diff.reduce((s, d, i) => s + d * tmp[i], 0);
  if (!Number.isFinite(raw)) return null;
  // A (slightly) negative statistic = no evidence against RE → clamp to 0.
  const stat = Math.max(0, raw);
  const pValue = chiSquareUpperTail(stat, k);
  return { stat, df: k, pValue, prefer: pValue < 0.05 ? "fe" : "re" };
}

/** Build & run OLS from a dataset: target Y + chosen numeric predictors. */
export function runRegression(
  ds: ParsedDataset,
  yName: string,
  xNames: string[],
): OlsResult | RegressionError {
  const predictors = xNames.filter((x) => x !== yName);
  if (predictors.length === 0) {
    return { kind: "error", message: "Pilih minimal satu variabel prediktor (X)." };
  }
  const y: number[] = [];
  const X: number[][] = [];
  for (const row of ds.rows) {
    const yv = parseNumber(row[yName]);
    if (yv === null || isMissing(row[yName])) continue;
    const xs = predictors.map((p) => parseNumber(row[p]));
    if (xs.some((v) => v === null)) continue; // complete-case
    y.push(yv);
    X.push(xs as number[]);
  }
  if (y.length === 0) {
    return { kind: "error", message: "Tidak ada baris lengkap untuk regresi." };
  }
  return ols(y, X, yName, predictors);
}
