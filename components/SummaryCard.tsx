"use client";

import type { FullAnalysis } from "@/lib/stats";
import type { DataQualityReport } from "@/lib/dataQuality";
import type { DataShape } from "@/lib/shape";
import { fmtNum } from "@/lib/stats";
import { Card } from "./ui";
import { useLang } from "./LanguageProvider";

const SHAPE_KEY: Record<DataShape, string> = {
  "cross-sectional": "shapeCross",
  timeseries: "shapeTs",
  panel: "shapePanel",
};

export default function SummaryCard({
  analysis,
  shape,
  quality,
}: {
  analysis: FullAnalysis;
  shape: DataShape;
  quality: DataQualityReport;
}) {
  const { t } = useLang();

  const nNum = analysis.numericStats.length;
  const nCat = analysis.categoricalStats.length;
  const topCorr = analysis.summary.strongCorrelations[0];
  const topOut = analysis.summary.notableOutliers[0];
  const scoreColor =
    quality.score >= 80
      ? "text-positive"
      : quality.score >= 50
        ? "text-amber-300"
        : "text-negative";

  const items: { label: string; value: React.ReactNode }[] = [
    { label: t("hlShape"), value: t(SHAPE_KEY[shape]) },
    {
      label: t("hlQuality"),
      value: <span className={scoreColor}>{quality.score}/100</span>,
    },
    {
      label: t("hlComposition"),
      value: `${nNum} ${t("hlNumeric")} · ${nCat} ${t("hlCategorical")}`,
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
      value: topOut
        ? `${topOut.column} (${fmtNum(topOut.pct)}%)`
        : t("hlNone"),
    },
  ];

  return (
    <Card>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div key={it.label} className="min-w-0">
            <div className="text-xs text-muted">{it.label}</div>
            <div className="truncate text-sm font-medium text-foreground">
              {it.value}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
