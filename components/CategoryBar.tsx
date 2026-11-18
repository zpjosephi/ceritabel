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
  const { data: barFill, soft, axis, fg, tooltipBg, border } = useAccentColors();
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
          tick={{ fill: axis, fontSize: 11 }}
          axisLine={false}
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
          formatter={(value, _name, item) => [
            `${value} (${(item?.payload?.pct ?? 0).toFixed(1)}%)`,
            item?.payload?.full ?? "",
          ]}
        />
        <Bar dataKey="count" radius={[0, 3, 3, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={barFill} fillOpacity={Math.max(0.45, 1 - i * 0.1)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
