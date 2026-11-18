"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { parseNumber, simpleLinearRegression, fmtNum } from "@/lib/stats";
import type { ParsedDataset } from "@/lib/types";
import { useLang } from "./LanguageProvider";
import { useAccentColors } from "./AccentPicker";

export default function ScatterPlot({
  dataset,
  numericFields,
}: {
  dataset: ParsedDataset;
  numericFields: string[];
}) {
  const { t } = useLang();
  const { data: dotFill, strong, grid, axis, fg, tooltipBg, border } = useAccentColors();
  const [xField, setXField] = useState(numericFields[0] ?? "");
  const [yField, setYField] = useState(numericFields[1] ?? numericFields[0] ?? "");
  const [showLine, setShowLine] = useState(true);

  const { points, regression, xDomain } = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (const row of dataset.rows) {
      const x = parseNumber(row[xField] ?? null);
      const y = parseNumber(row[yField] ?? null);
      if (x !== null && y !== null) pts.push({ x, y });
    }
    const reg = simpleLinearRegression(
      xField,
      yField,
      pts.map((p) => p.x),
      pts.map((p) => p.y),
    );
    const xs = pts.map((p) => p.x);
    const dom: [number, number] =
      xs.length > 0 ? [Math.min(...xs), Math.max(...xs)] : [0, 1];
    return { points: pts, regression: reg, xDomain: dom };
  }, [dataset, xField, yField]);

  if (numericFields.length < 2) {
    return <p className="text-sm text-muted">{t("scatterNeed2")}</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <FieldSelect label="X" value={xField} fields={numericFields} onChange={setXField} />
        <FieldSelect label="Y" value={yField} fields={numericFields} onChange={setYField} />
        <label className="ml-auto flex items-center gap-2 text-muted">
          <input
            type="checkbox"
            checked={showLine}
            onChange={(e) => setShowLine(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          {t("regLine")}
        </label>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
          <CartesianGrid stroke={grid} />
          <XAxis
            type="number"
            dataKey="x"
            name={xField}
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => fmtNum(v)}
            tick={{ fill: axis, fontSize: 11 }}
            axisLine={{ stroke: grid }}
            tickLine={false}
            label={{ value: xField, position: "insideBottom", offset: -8, fill: axis, fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yField}
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => fmtNum(v)}
            tick={{ fill: axis, fontSize: 11 }}
            axisLine={{ stroke: grid }}
            tickLine={false}
            width={56}
            label={{ value: yField, angle: -90, position: "insideLeft", fill: axis, fontSize: 12 }}
          />
          <ZAxis range={[36, 36]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: axis }}
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${border}`,
              borderRadius: 8,
              color: fg,
              fontSize: 12,
            }}
          />
          <Scatter data={points} fill={dotFill} fillOpacity={0.7} />
          {showLine && regression ? (
            <ReferenceLine
              stroke={strong}
              strokeWidth={2}
              ifOverflow="extendDomain"
              segment={[
                { x: xDomain[0], y: regression.intercept + regression.slope * xDomain[0] },
                { x: xDomain[1], y: regression.intercept + regression.slope * xDomain[1] },
              ]}
            />
          ) : null}
        </ScatterChart>
      </ResponsiveContainer>

      {regression ? (
        <p className="mt-3 text-sm text-muted">
          <span className="font-mono text-foreground">
            ŷ = {fmtNum(regression.intercept)} + {fmtNum(regression.slope)}·x
          </span>{" "}
          · R² = <span className="text-foreground">{fmtNum(regression.r2)}</span> · n ={" "}
          {regression.n}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">{t("regUnavailable")}</p>
      )}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  fields,
  onChange,
}: {
  label: string;
  value: string;
  fields: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-foreground focus:border-muted"
      >
        {fields.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    </label>
  );
}
