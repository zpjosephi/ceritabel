"use client";

import type { FullAnalysis } from "@/lib/stats";
import { Stat } from "./ui";
import { useLang } from "./LanguageProvider";

export default function DatasetOverview({
  analysis,
}: {
  analysis: FullAnalysis;
}) {
  const { t, lang } = useLang();
  const numericCount = analysis.numericStats.length;
  const categoricalCount = analysis.categoricalStats.length;

  const totalCells = analysis.rowCount * analysis.columnCount;
  const totalMissing = analysis.columns.reduce((acc, c) => acc + c.missing, 0);
  const missingPct =
    totalCells > 0 ? (totalMissing / totalCells) * 100 : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        label={t("ovRows")}
        value={analysis.rowCount.toLocaleString(lang === "en" ? "en-US" : "id-ID")}
        accent
      />
      <Stat label={t("ovCols")} value={analysis.columnCount} />
      <Stat
        label={t("ovNumCat")}
        value={`${numericCount} / ${categoricalCount}`}
      />
      <Stat label={t("ovMissing")} value={`${missingPct.toFixed(1)}%`} />
    </div>
  );
}
