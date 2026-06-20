"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoricalSummary } from "@/lib/types";
import { useLang } from "./LanguageProvider";
import { useAccentColors } from "./AccentPicker";

export default function CategoryBar({
  summary,
}: {
  summary: CategoricalSummary;
}) {
  const { t } = useLang();
  const { accent, soft } = useAccentColors();
  const data = summary.topCategories.map((c) => ({
    name: c.value.length > 18 ? c.value.slice(0, 17) + "…" : c.value,
    full: c.value,
    count: c.count,
    pct: c.pct,
  }));

  if (data.length === 0) {
    return <p className="text-sm text-muted">{t("noCategory")}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 34)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 16, bottom: 0, left: 4 }}
      >
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={96}
          tick={{ fill: "#9a9aab", fontSize: 11 }}
          axisLine={false}
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
          formatter={(value, _name, item) => [
            `${value} (${(item?.payload?.pct ?? 0).toFixed(1)}%)`,
            item?.payload?.full ?? "",
          ]}
        />
        <Bar dataKey="count" radius={[0, 3, 3, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={accent} fillOpacity={1 - i * 0.13} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
