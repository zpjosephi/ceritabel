"use client";

import { useMemo, useState } from "react";
import { computePanel } from "@/lib/panel";
import { fmtNum } from "@/lib/stats";
import type { FullAnalysis } from "@/lib/stats";
import type { ParsedDataset } from "@/lib/types";
import { Card, Badge, Stat } from "./ui";
import { useLang } from "./LanguageProvider";

export default function PanelAnalysis({
  dataset,
  analysis,
  entityCol,
  timeCol,
}: {
  dataset: ParsedDataset;
  analysis: FullAnalysis;
  entityCol: string;
  timeCol: string;
}) {
  const { t } = useLang();
  const [entity, setEntity] = useState(entityCol);
  const [time, setTime] = useState(timeCol);

  const result = useMemo(
    () => computePanel(dataset, analysis, entity, time),
    [dataset, analysis, entity, time],
  );

  const allCols = analysis.columns.map((c) => c.name);
  const maxSd = Math.max(
    1,
    ...result.decomposition.map((d) => Math.max(d.betweenSd, d.withinSd)),
  );

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="accent">{t("panelDetected")}</Badge>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <ColSelect label={t("panelEntityLabel")} value={entity} cols={allCols} onChange={setEntity} />
        <span className="pb-1.5 text-muted">×</span>
        <ColSelect label={t("panelTimeLabel")} value={time} cols={allCols} onChange={setTime} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("panelEntities")} value={result.nEntities} accent />
        <Stat label={t("panelPeriods")} value={result.nPeriods} />
        <Stat label={t("panelObs")} value={result.nObs} />
        <Stat
          label={t("panelCompleteness")}
          value={`${result.completenessPct.toFixed(0)}%`}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={result.balanced ? "accent" : "neutral"}>
          {result.balanced ? t("panelBalanced") : t("panelUnbalanced")}
        </Badge>
        {result.uniquenessPct < 95 ? (
          <span className="text-xs text-negative">{t("panelMessy")}</span>
        ) : null}
      </div>

      {result.decomposition.length > 0 ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-strong">
            {t("panelDecomp")}
          </h4>
          <div className="space-y-2">
            {/* header */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-1 text-xs text-muted">
              <span />
              <div className="flex gap-4 tabular-nums">
                <span className="w-16 text-right">{t("panelBetween")}</span>
                <span className="w-16 text-right">{t("panelWithin")}</span>
              </div>
            </div>
            {result.decomposition.map((d) => {
              const dominBetween = d.betweenSd >= d.withinSd;
              return (
                <div
                  key={d.column}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-transparent bg-surface-2/40 px-3 py-2 transition hover:border-accent/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm text-foreground">{d.column}</span>
                      <Badge tone="neutral">
                        {dominBetween ? t("panelDominBetween") : t("panelDominWithin")}
                      </Badge>
                    </div>
                    {/* stacked bar: between vs within share */}
                    <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-surface">
                      <div
                        className="bg-accent"
                        style={{ width: `${(d.betweenSd / maxSd) * 50}%` }}
                        title={`between SD ${fmtNum(d.betweenSd)}`}
                      />
                      <div
                        className="bg-accent/40"
                        style={{ width: `${(d.withinSd / maxSd) * 50}%` }}
                        title={`within SD ${fmtNum(d.withinSd)}`}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm tabular-nums">
                    <span className="w-16 text-right text-foreground">{fmtNum(d.betweenSd)}</span>
                    <span className="w-16 text-right text-muted">{fmtNum(d.withinSd)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">{t("panelLegend")}</p>
        </div>
      ) : null}
    </Card>
  );
}

function ColSelect({
  label,
  value,
  cols,
  onChange,
}: {
  label: string;
  value: string;
  cols: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-foreground outline-none focus:border-accent"
      >
        {cols.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
