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
  const { accent, soft } = useAccentColors();
  if (bins.length === 0) {
    return <p className="text-sm text-muted">{t("noNumeric")}</p>;
  }
  const data = bins.map((b, i) => ({ name: b.label, count: b.count, i }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" vertical={false} />
        <XAxis
          dataKey="i"
          tick={false}
          axisLine={{ stroke: "#2a2a38" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "#9a9aab", fontSize: 11 }}
          axisLine={{ stroke: "#2a2a38" }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: soft }}
          contentStyle={{
            background: "#1c1c27",
            border: "1px solid #2a2a38",
            borderRadius: 8,
            color: "#ededf2",
            fontSize: 12,
          }}
          labelFormatter={(_, payload) =>
            payload?.[0] ? t("rangeLabel", { x: payload[0].payload.name }) : ""
          }
          formatter={(value) => [value as number, t("count")]}
        />
        <Bar dataKey="count" fill={accent} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
