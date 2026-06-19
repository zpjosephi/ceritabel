"use client";

import { useMemo } from "react";
import type { FullAnalysis } from "@/lib/stats";
import { histogramBins, fmtNum } from "@/lib/stats";
import type {
  CategoricalSummary,
  ColumnKind,
  NumericSummary,
  ParsedDataset,
} from "@/lib/types";
import { Badge, Card } from "./ui";
import Histogram from "./Histogram";
import CategoryBar from "./CategoryBar";
import { useLang } from "./LanguageProvider";

export default function ColumnSummary({
  analysis,
  dataset,
}: {
  analysis: FullAnalysis;
  dataset: ParsedDataset;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {analysis.columns.map((col) => (
        <ColumnCard
          key={col.name}
          column={col}
          kind={analysis.columnKinds[col.name] ?? col.type}
          rawValues={dataset.rows.map((r) => r[col.name] ?? null)}
        />
      ))}
    </div>
  );
}

const KIND_LABEL: Record<ColumnKind, string> = {
  numeric: "typeNumeric",
  categorical: "typeCategorical",
  datetime: "typeDatetime",
  boolean: "typeBoolean",
};

function ColumnCard({
  column,
  kind,
  rawValues,
}: {
  column: NumericSummary | CategoricalSummary;
  kind: ColumnKind;
  rawValues: (string | null)[];
}) {
  const { t } = useLang();
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="truncate font-medium text-foreground" title={column.name}>
          {column.name}
        </h3>
        <Badge tone={kind === "numeric" ? "accent" : "neutral"}>
          {t(KIND_LABEL[kind])}
        </Badge>
      </div>

      {column.missing > 0 ? (
        <p className="mb-2 text-xs text-muted">
          {t("missingLine", {
            n: column.missing,
            pct: column.missingPct.toFixed(1),
          })}
        </p>
      ) : (
        <p className="mb-2 text-xs text-muted">{t("noMissing")}</p>
      )}

      {column.type === "numeric" ? (
        <NumericBody col={column} rawValues={rawValues} />
      ) : (
        <CategoricalBody col={column} />
      )}
    </Card>
  );
}

function NumericBody({
  col,
  rawValues,
}: {
  col: NumericSummary;
  rawValues: (string | null)[];
}) {
  const { t } = useLang();
  const bins = useMemo(() => histogramBins(rawValues), [rawValues]);
  const stats: [string, number][] = [
    ["mean", col.mean],
    ["median", col.median],
    ["std", col.std],
    ["min", col.min],
    ["max", col.max],
    ["Q1", col.q1],
    ["Q3", col.q3],
  ];

  return (
    <div>
      <Histogram bins={bins} />
      <dl className="mt-3 grid grid-cols-4 gap-x-2 gap-y-2 text-sm">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="tabular-nums">{fmtNum(value)}</dd>
          </div>
        ))}
        <div>
          <dt className="text-xs text-muted">{t("statOutlier")}</dt>
          <dd className="tabular-nums">{col.outlierCount}</dd>
        </div>
      </dl>
    </div>
  );
}

function CategoricalBody({ col }: { col: CategoricalSummary }) {
  const { t } = useLang();
  return (
    <div>
      <p className="mb-2 text-xs text-muted">
        {t("uniqueCats", { n: col.uniqueCount })}
      </p>
      <CategoryBar summary={col} />
    </div>
  );
}
