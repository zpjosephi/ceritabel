"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import type { FullAnalysis } from "@/lib/stats";
import { fmtNum } from "@/lib/stats";
import type { AIInsight, ParsedDataset } from "@/lib/types";
import type { DataQualityReport } from "@/lib/dataQuality";
import type { CleaningChange } from "@/lib/cleaning";
import type { DataShape } from "@/lib/shape";
import { runRegression } from "@/lib/regression";
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
}) {
  const { t } = useLang();
  const showInsight = insight && !insightStale && !insight.raw;

  // The same default model the Tests & Models tab opens with: the guessed
  // target explained by every other numeric column.
  const reg = useMemo(() => {
    const numericFields = analysis.numericStats.map((s) => s.name);
    if (numericFields.length < 2 || !numericFields.includes(regTarget)) {
      return null;
    }
    const r = runRegression(dataset, regTarget, numericFields);
    return r.kind === "ols" ? r : null;
  }, [dataset, regTarget, analysis]);

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

      {reg && (
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">{t("reportReg")}</h2>
          <p className="text-sm text-muted">
            {t("reportRegNote").replace("{y}", reg.y)}
          </p>
          <p className="tnum mt-1 text-sm">
            n={reg.n} · R²={fmtNum(reg.r2)} · adj. R²={fmtNum(reg.adjR2)} · F(
            {reg.fDf1}, {reg.fDf2})={fmtNum(reg.fStat)} · p={fmtP(reg.fPValue)}
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
              {reg.terms.map((term) => (
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
