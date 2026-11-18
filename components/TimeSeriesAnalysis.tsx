"use client";

import { useMemo, useState } from "react";
import { TrendUp, TrendDown, ArrowRight } from "@phosphor-icons/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyzeTimeSeries } from "@/lib/timeseries";
import { fmtNum } from "@/lib/stats";
import type { FullAnalysis } from "@/lib/stats";
import type { ParsedDataset } from "@/lib/types";
import { Card, Badge } from "./ui";
import { useLang } from "./LanguageProvider";
import { useAccentColors } from "./AccentPicker";

export default function TimeSeriesAnalysis({
  dataset,
  analysis,
  timeCol,
}: {
  dataset: ParsedDataset;
  analysis: FullAnalysis;
  timeCol: string;
}) {
  const { data: SERIES, strong: ACCENT_STRONG, grid, axis, fg, tooltipBg, border } = useAccentColors();
  const { t } = useLang();
  const numericCols = analysis.numericStats
    .map((s) => s.name)
    .filter((n) => n !== timeCol);
  const [valueCol, setValueCol] = useState(numericCols[0] ?? "");

  const result = useMemo(
    () =>
      valueCol ? analyzeTimeSeries(dataset, timeCol, valueCol) : null,
    [dataset, timeCol, valueCol],
  );

  if (numericCols.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">{t("tsNeedValue")}</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">{t("tsValue")}</span>
          <select
            value={valueCol}
            onChange={(e) => setValueCol(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-foreground focus:border-muted"
          >
            {numericCols.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {result ? (
          <Badge tone={result.trend === "flat" ? "neutral" : "accent"}>
            <span className="inline-flex items-center gap-1">
              {result.trend === "up" ? (
                <TrendUp size={13} weight="bold" aria-hidden />
              ) : result.trend === "down" ? (
                <TrendDown size={13} weight="bold" aria-hidden />
              ) : (
                <ArrowRight size={13} weight="bold" aria-hidden />
              )}
              {t("tsTrend")}:{" "}
              {result.trend === "up"
                ? t("tsUp")
                : result.trend === "down"
                  ? t("tsDown")
                  : t("tsFlat")}
            </span>
          </Badge>
        ) : null}
      </div>

      {!result ? (
        <p className="text-sm text-muted">{t("tsNeedValue")}</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={result.points}
              margin={{ top: 5, right: 12, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: axis, fontSize: 10 }}
                axisLine={{ stroke: grid }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: axis, fontSize: 11 }}
                axisLine={{ stroke: grid }}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  color: fg,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={t("tsValueLabel")}
                stroke={SERIES}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="ma"
                name={t("tsMa", { n: result.maWindow })}
                stroke={ACCENT_STRONG}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <Metric
              label={t("tsTotalChange")}
              value={`${fmtNum(result.totalChange)}${
                result.totalChangePct !== null
                  ? ` (${fmtNum(result.totalChangePct)}%)`
                  : ""
              }`}
              accent
            />
            <Metric label={t("tsAvgChange")} value={fmtNum(result.avgChange)} />
            <Metric label="R²" value={fmtNum(result.r2)} />
            <Metric
              label={t("tsAutocorr")}
              value={result.autocorrLag1 !== null ? fmtNum(result.autocorrLag1) : "-"}
            />
          </div>
          <p className="mt-3 text-xs text-muted">
            {result.startLabel} → {result.endLabel} · {result.n} {t("panelObs").toLowerCase()}
          </p>
        </>
      )}
    </Card>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`tabular-nums ${accent ? "font-semibold text-foreground" : "text-foreground/85"}`}>
        {value}
      </div>
    </div>
  );
}
