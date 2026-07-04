"use client";

import type { FullAnalysis } from "@/lib/stats";
import { fmtNum } from "@/lib/stats";
import type { AIInsight } from "@/lib/types";
import type { DataQualityReport } from "@/lib/dataQuality";
import type { DataShape } from "@/lib/shape";
import CorrelationHeatmap from "./CorrelationHeatmap";
import { useLang } from "./LanguageProvider";

const SHAPE_KEY: Record<DataShape, string> = {
  "cross-sectional": "shapeCross",
  timeseries: "shapeTs",
  panel: "shapePanel",
};

/**
 * The printable analysis report. Hidden on screen; the print stylesheet makes
 * it the only visible thing when the user prints (or hits "Download report",
 * which just opens the print dialog for a save-as-PDF). Everything here is the
 * already-computed analysis: printing invents nothing.
 */
export default function ReportPrint({
  fileName,
  shape,
  analysis,
  quality,
  insight,
  insightStale,
}: {
  fileName: string;
  shape: DataShape;
  analysis: FullAnalysis;
  quality: DataQualityReport;
  insight: AIInsight | null;
  insightStale: boolean;
}) {
  const { t } = useLang();
  const showInsight = insight && !insightStale && !insight.raw;

  return (
    <div className="print-report" aria-hidden>
      <header className="mb-6 border-b border-border pb-4">
        <div className="text-lg font-semibold tracking-tight">
          cerita<span className="text-accent">bel</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {t("reportTitle")}
        </h1>
        <p className="tnum mt-1 text-sm text-muted">
          {fileName} · {t(SHAPE_KEY[shape])} · {analysis.rowCount}{" "}
          {t("reportRows")} × {analysis.columnCount} {t("reportCols")} ·{" "}
          {t("hlQuality")} {quality.score}/100
        </p>
      </header>

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
          <CorrelationHeatmap cm={analysis.correlation} />
        </section>
      )}

      {showInsight && (
        <section className="mb-6">
          <h2 className="mb-2 text-base font-semibold">{t("reportInsight")}</h2>
          <p className="text-sm leading-relaxed">{insight.summary}</p>
          {insight.findings.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {insight.findings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer className="mt-8 border-t border-border pt-3 text-xs text-muted">
        {t("reportMadeWith")} · ceritabel.vercel.app
      </footer>
    </div>
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
