"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistogramBin } from "@/lib/types";
import { useLang } from "./LanguageProvider";
import { useAccentColors } from "./AccentPicker";

export default function Histogram({ bins }: { bins: HistogramBin[] }) {
  const { t } = useLang();
  const { data: barFill, soft, grid, axis, fg, tooltipBg, border } = useAccentColors();
  if (bins.length === 0) {
    return <p className="text-sm text-muted">{t("noNumeric")}</p>;
  }
  const data = bins.map((b, i) => ({ name: b.label, count: b.count, i }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis
          dataKey="i"
          tick={false}
          axisLine={{ stroke: grid }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: axis, fontSize: 11 }}
          axisLine={{ stroke: grid }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: soft }}
          contentStyle={{
            background: tooltipBg,
            border: `1px solid ${border}`,
            borderRadius: 8,
            color: fg,
            fontSize: 12,
          }}
          labelFormatter={(_, payload) =>
            payload?.[0] ? t("rangeLabel", { x: payload[0].payload.name }) : ""
          }
          formatter={(value) => [value as number, t("count")]}
        />
        <Bar dataKey="count" fill={barFill} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
