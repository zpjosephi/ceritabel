"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import type { FullAnalysis } from "@/lib/stats";
import { fmtNum } from "@/lib/stats";
import type { AIInsight, ParsedDataset } from "@/lib/types";
import type { DataQualityReport } from "@/lib/dataQuality";
import type { CleaningChange } from "@/lib/cleaning";
import type { DataShape } from "@/lib/shape";
import {
  runRegression,
  fixedEffects,
  randomEffects,
  hausmanTest,
  classicalAssumptions,
  type OlsResult,
} from "@/lib/regression";
import { analyzeTimeSeries } from "@/lib/timeseries";
import CorrelationHeatmap from "./CorrelationHeatmap";
import { useLang } from "./LanguageProvider";

const SHAPE_KEY: Record<DataShape, string> = {
  "cross-sectional": "shapeCross",
  timeseries: "shapeTs",
  panel: "shapePanel",
};

function fmtP(p: number): string {
  if (!Number.isFinite(p)) return "-";
  return p < 0.001 ? "<0.001" : p.toFixed(3);
}

/**
 * The printable analysis report: the full story a user hands to someone else.
 * Highlights, cleaning steps, per-column stats, the strongest relationships in
 * words, the heatmap, a default OLS regression, and the AI reading. Everything
 * is the app's own computed output: printing invents nothing.
 *
 * Rendered into <body> directly so the print stylesheet can display:none every
 * other body child. Only mounts client-side, after a dataset is loaded.
 */
export default function ReportPrint({
  fileName,
  shape,
  analysis,
  quality,
  insight,
  insightStale,
  dataset,
  regTarget,
  changes,
  excludeFromModels,
  panelEntity,
  panelTime,
  tsTime,
}: {
  fileName: string;
  shape: DataShape;
  analysis: FullAnalysis;
  quality: DataQualityReport;
  insight: AIInsight | null;
  insightStale: boolean;
  dataset: ParsedDataset;
  regTarget: string;
  changes: CleaningChange[];
  /** identifier-looking columns kept out of the default models */
  excludeFromModels?: string[];
  panelEntity?: string;
  panelTime?: string;
  tsTime?: string;
}) {
  const { t } = useLang();
  const showInsight = insight && !insightStale && !insight.raw;

  // The same default models the Tests & Models tab opens with: the guessed
  // target explained by every other numeric column. For panel data that means
  // all three estimators (Pooled / FE / RE) plus the Hausman test, exactly
  // like the tab; a single pooled OLS would sell the panel analysis short.
  const models = useMemo(() => {
    const raw = analysis.numericStats.map((s) => s.name);
    const noIds = raw.filter((c) => !excludeFromModels?.includes(c));
    const numeric = noIds.length >= 2 ? noIds : raw;
    // Mirror the tab exactly: for panel data the entity and time columns are
    // structure, not predictors (a time column is constant across entity
    // means, which makes the RE between-regression singular).
    const usable =
      shape === "panel"
        ? numeric.filter((c) => c !== panelEntity && c !== panelTime)
        : numeric;
    const y = usable.includes(regTarget) ? regTarget : usable[0];
    if (!y || usable.length < 2) return null;
    const xs = usable.filter((c) => c !== y);
    const pooled = runRegression(dataset, y, xs);
    if (pooled.kind !== "ols") return null;
    if (shape === "panel" && panelEntity) {
      const feR = fixedEffects(dataset, y, xs, panelEntity);
      const reR = randomEffects(dataset, y, xs, panelEntity);
      const fe = feR.kind === "ols" ? feR : null;
      const re = reR.kind === "ols" ? reR : null;
      const hausman = fe && re ? hausmanTest(fe, re) : null;
      return { pooled, fe, re, hausman };
    }
    return { pooled, fe: null, re: null, hausman: null };
  }, [dataset, regTarget, analysis, shape, panelEntity, panelTime, excludeFromModels]);

  // Classical OLS assumption checks (JB / BP / DW / VIF), shown with the
  // single-equation model; the tab computes the same set.
  const assumptions = useMemo(() => {
    const raw = analysis.numericStats.map((s) => s.name);
    const noIds = raw.filter((c) => !excludeFromModels?.includes(c));
    const numeric = noIds.length >= 2 ? noIds : raw;
    const y = numeric.includes(regTarget) ? regTarget : numeric[0];
    if (!y || numeric.length < 2) return null;
    const xs = numeric.filter((c) => c !== y);
    const a = classicalAssumptions(dataset, y, xs);
    return a.kind === "assumptions" ? a : null;
  }, [dataset, regTarget, analysis, excludeFromModels]);

  // Time-series read (trend, total change, lag-1 autocorrelation), mirroring
  // the tab's default value column: the first numeric that isn't the time.
  const ts = useMemo(() => {
    if (shape !== "timeseries" || !tsTime) return null;
    const valueCol = analysis.numericStats
      .map((s) => s.name)
      .find((c) => c !== tsTime);
    return valueCol ? analyzeTimeSeries(dataset, tsTime, valueCol) : null;
  }, [shape, tsTime, dataset, analysis]);

  const topCorr = analysis.summary.strongCorrelations[0];
  const topOut = analysis.summary.notableOutliers[0];
  const strong = analysis.summary.strongCorrelations.slice(0, 6);

  const highlights: { label: string; value: string }[] = [
    { label: t("hlShape"), value: t(SHAPE_KEY[shape]) },
    { label: t("hlQuality"), value: `${quality.score}/100` },
    {
      label: t("hlComposition"),
      value: `${analysis.numericStats.length} ${t("hlNumeric")} · ${analysis.categoricalStats.length} ${t("hlCategorical")}`,
    },
    { label: t("hlMissing"), value: `${quality.missingPct.toFixed(1)}%` },
    {
      label: t("hlTopCorr"),
      value: topCorr
        ? `${topCorr.a} ↔ ${topCorr.b} (r=${fmtNum(topCorr.r)})`
        : t("hlNone"),
    },
    {
      label: t("hlTopOutlier"),
      value: topOut ? `${topOut.column} (${fmtNum(topOut.pct)}%)` : t("hlNone"),
    },
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="print-report" aria-hidden>
      <header className="mb-6 border-b border-border pb-4">
        <div className="text-lg font-semibold tracking-tight">
          cerita<span className="text-accent">bel</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {t("reportTitle")}
        </h1>
        <p className="tnum mt-1 text-sm text-muted">
          {fileName} · {analysis.rowCount} {t("reportRows")} ×{" "}
          {analysis.columnCount} {t("reportCols")}
        </p>
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-base font-semibold">{t("reportHighlights")}</h2>
        <div className="grid grid-cols-3 gap-x-6 gap-y-2">
          {highlights.map((h) => (
            <div key={h.label}>
              <div className="text-xs text-muted">{h.label}</div>
              <div className="tnum break-words text-sm font-medium">
                {h.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {changes.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">{t("reportCleaning")}</h2>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {changes.map((c, i) => (
              <li key={i}>{c.description}</li>
            ))}
          </ul>
        </section>
      )}

      {analysis.numericStats.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">{t("reportNumeric")}</h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-left text-muted">
                <th className="border-b border-border px-2 py-1.5 font-medium">
                  {t("reportCols")}
                </th>
                <Th>n</Th>
                <Th>miss%</Th>
                <Th>mean</Th>
                <Th>median</Th>
                <Th>std</Th>
                <Th>min</Th>
                <Th>max</Th>
                <Th>outlier</Th>
              </tr>
            </thead>
            <tbody>
              {analysis.numericStats.map((s) => (
                <tr key={s.name}>
                  <td className="border-b border-border px-2 py-1.5 font-medium">
                    {s.name}
                  </td>
                  <Td>{s.count}</Td>
                  <Td>{s.missingPct.toFixed(1)}</Td>
                  <Td>{fmtNum(s.mean)}</Td>
                  <Td>{fmtNum(s.median)}</Td>
                  <Td>{fmtNum(s.std)}</Td>
                  <Td>{fmtNum(s.min)}</Td>
                  <Td>{fmtNum(s.max)}</Td>
                  <Td>{s.outlierCount}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {analysis.categoricalStats.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">
            {t("reportCategorical")}
          </h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-left text-muted">
                <th className="border-b border-border px-2 py-1.5 font-medium">
                  {t("reportCols")}
                </th>
                <Th>n</Th>
                <Th>miss%</Th>
                <Th>{t("reportUnique")}</Th>
                <th className="border-b border-border px-2 py-1.5 font-medium">
                  {t("reportTopCat")}
                </th>
              </tr>
            </thead>
            <tbody>
              {analysis.categoricalStats.map((s) => (
                <tr key={s.name}>
                  <td className="border-b border-border px-2 py-1.5 font-medium">
                    {s.name}
                  </td>
                  <Td>{s.count}</Td>
                  <Td>{s.missingPct.toFixed(1)}</Td>
                  <Td>{s.uniqueCount}</Td>
                  <td className="tnum border-b border-border px-2 py-1.5">
                    {s.topCategories[0]
                      ? `${s.topCategories[0].value} (${s.topCategories[0].pct.toFixed(0)}%)`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {analysis.correlation.fields.length >= 2 && (
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">{t("reportCorr")}</h2>
          {strong.length > 0 ? (
            <ul className="mb-3 list-disc space-y-0.5 pl-5 text-sm">
              {strong.map((c) => (
                <li key={`${c.a}-${c.b}`} className="tnum">
                  {c.a} ↔ {c.b} · r={fmtNum(c.r)} ·{" "}
                  {c.r >= 0 ? t("reportDirPos") : t("reportDirNeg")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm text-muted">{t("reportNoStrong")}</p>
          )}
          <CorrelationHeatmap cm={analysis.correlation} />
        </section>
      )}

      {ts && (
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">{t("secTs")}</h2>
          <p className="tnum text-sm">
            {ts.valueCol} · {ts.startLabel} → {ts.endLabel} · n={ts.n}
          </p>
          <p className="tnum mt-1 text-sm">
            {t("tsTrend")}:{" "}
            {t(
              ts.trend === "up"
                ? "tsUp"
                : ts.trend === "down"
                  ? "tsDown"
                  : "tsFlat",
            )}{" "}
            (R²={fmtNum(ts.r2)}) · {t("tsTotalChange")}: {fmtNum(ts.totalChange)}
            {ts.totalChangePct !== null
              ? ` (${fmtNum(ts.totalChangePct)}%)`
              : ""}{" "}
            · {t("tsAutocorr")}:{" "}
            {ts.autocorrLag1 !== null ? fmtNum(ts.autocorrLag1) : "-"}
          </p>
        </section>
      )}

      {models && (
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">
            {models.fe && models.re ? t("reportPanelModels") : t("reportReg")}
          </h2>
          <p className="text-sm text-muted">
            {t("reportRegNote").replace("{y}", models.pooled.y)}
            {models.fe && panelEntity
              ? ` · ${t("panelEntityLabel")}: ${panelEntity}${
                  panelTime ? ` · ${t("panelTimeLabel")}: ${panelTime}` : ""
                }`
              : ""}
          </p>

          {models.fe && models.re ? (
            <>
              <table className="mt-2 w-full border-collapse text-xs">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="border-b border-border px-2 py-1.5 font-medium">
                      Model
                    </th>
                    <Th>n</Th>
                    <Th>R²</Th>
                    <Th>adj. R²</Th>
                    <Th>F</Th>
                    <Th>p</Th>
                  </tr>
                </thead>
                <tbody>
                  <FitRow label="Pooled OLS" m={models.pooled} />
                  <FitRow label="Fixed Effects *" m={models.fe} />
                  <FitRow label="Random Effects" m={models.re} />
                </tbody>
              </table>
              <p className="mt-1 text-xs text-muted">
                * Fixed Effects: {t("regWithinR2")}
              </p>

              <table className="mt-3 w-full border-collapse text-xs">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="border-b border-border px-2 py-1.5 font-medium">
                      {t("regCoef")}
                    </th>
                    <Th>Pooled</Th>
                    <Th>FE</Th>
                    <Th>RE</Th>
                  </tr>
                </thead>
                <tbody>
                  {models.pooled.terms.map((term) => (
                    <tr key={term.name}>
                      <td className="border-b border-border px-2 py-1.5 font-medium">
                        {term.name}
                      </td>
                      <Td>
                        {fmtNum(term.coef)} (p={fmtP(term.p)})
                      </Td>
                      <Td>{coefCell(models.fe, term.name)}</Td>
                      <Td>{coefCell(models.re, term.name)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {models.hausman && (
                <p className="tnum mt-2 text-sm">
                  {t("hausman")}: stat={fmtNum(models.hausman.stat)} · df=
                  {models.hausman.df} · p={fmtP(models.hausman.pValue)} ·{" "}
                  <span className="font-medium">
                    {models.hausman.prefer === "fe"
                      ? t("hausmanFe")
                      : t("hausmanRe")}
                  </span>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="tnum mt-1 text-sm">
                n={models.pooled.n} · R²={fmtNum(models.pooled.r2)} · adj. R²=
                {fmtNum(models.pooled.adjR2)} · F({models.pooled.fDf1},{" "}
                {models.pooled.fDf2})={fmtNum(models.pooled.fStat)} · p=
                {fmtP(models.pooled.fPValue)}
              </p>
              <table className="mt-2 w-full border-collapse text-xs">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="border-b border-border px-2 py-1.5 font-medium">
                      {t("regCoef")}
                    </th>
                    <Th>coef</Th>
                    <Th>SE</Th>
                    <Th>t</Th>
                    <Th>p</Th>
                  </tr>
                </thead>
                <tbody>
                  {models.pooled.terms.map((term) => (
                    <tr key={term.name}>
                      <td className="border-b border-border px-2 py-1.5 font-medium">
                        {term.name}
                      </td>
                      <Td>{fmtNum(term.coef)}</Td>
                      <Td>{fmtNum(term.se)}</Td>
                      <Td>{fmtNum(term.t)}</Td>
                      <Td>{fmtP(term.p)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assumptions && (
                <div className="mt-3">
                  <h3 className="text-sm font-semibold">{t("assumTitle")}</h3>
                  <ul className="tnum mt-1 list-disc space-y-0.5 pl-5 text-sm">
                    <li>
                      {t("assumNormality")}: JB=
                      {fmtNum(assumptions.normality.jb)} · p=
                      {fmtP(assumptions.normality.p)}
                    </li>
                    <li>
                      {t("assumHetero")}: BP={fmtNum(assumptions.hetero.bp)} ·
                      p={fmtP(assumptions.hetero.p)}
                    </li>
                    <li>
                      {t("assumAutocorr")}: DW=
                      {fmtNum(assumptions.durbinWatson)}
                    </li>
                    {assumptions.vif.length > 0 && (
                      <li>
                        {t("assumVifMax")}:{" "}
                        {(() => {
                          const top = [...assumptions.vif].sort(
                            (a, b) => b.vif - a.vif,
                          )[0];
                          return `${top.name} (${fmtNum(top.vif)})`;
                        })()}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {showInsight && (
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">{t("reportInsight")}</h2>
          <p className="text-sm leading-relaxed">{insight.summary}</p>
          {insight.findings.length > 0 && (
            <>
              <h3 className="mt-3 text-sm font-semibold">{t("aiFindings")}</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {insight.findings.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </>
          )}
          {insight.suggestions.length > 0 && (
            <>
              <h3 className="mt-3 text-sm font-semibold">
                {t("aiSuggestions")}
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {insight.suggestions.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <footer className="mt-8 border-t border-border pt-3 text-xs text-muted">
        {t("reportMadeWith")} · ceritabel.vercel.app
      </footer>
    </div>,
    document.body,
  );
}

function coefCell(m: OlsResult | null, name: string): string {
  const term = m?.terms.find((x) => x.name === name);
  return term ? `${fmtNum(term.coef)} (p=${fmtP(term.p)})` : "-";
}

function FitRow({ label, m }: { label: string; m: OlsResult }) {
  return (
    <tr>
      <td className="border-b border-border px-2 py-1.5 font-medium">
        {label}
      </td>
      <Td>{m.n}</Td>
      <Td>{fmtNum(m.r2)}</Td>
      <Td>{fmtNum(m.adjR2)}</Td>
      <Td>{fmtNum(m.fStat)}</Td>
      <Td>{fmtP(m.fPValue)}</Td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-border px-2 py-1.5 text-right font-medium">
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="tnum border-b border-border px-2 py-1.5 text-right">
      {children}
    </td>
  );
}
