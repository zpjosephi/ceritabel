"use client";

import type { CorrelationMatrix } from "@/lib/types";
import { useLang } from "./LanguageProvider";

/**
 * Diverging color for a Pearson r in [-1, 1]:
 *  negative → rose, 0 → neutral surface, positive → violet accent.
 * Returns an rgba background string.
 */
function colorFor(r: number | null): string {
  if (r === null) return "transparent";
  const mag = Math.min(1, Math.abs(r));
  if (r >= 0) {
    // violet accent (124, 92, 252)
    return `rgba(124, 92, 252, ${0.12 + mag * 0.78})`;
  }
  // rose (251, 113, 133)
  return `rgba(251, 113, 133, ${0.12 + mag * 0.78})`;
}

export default function CorrelationHeatmap({
  cm,
}: {
  cm: CorrelationMatrix;
}) {
  const { t } = useLang();
  const { fields, matrix } = cm;
  if (fields.length < 2) {
    return <p className="text-sm text-muted">{t("corrNeed2")}</p>;
  }

  const n = fields.length;

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-px text-xs"
        style={{
          gridTemplateColumns: `minmax(80px, 140px) repeat(${n}, minmax(40px, 1fr))`,
        }}
      >
        {/* header row */}
        <div />
        {fields.map((f) => (
          <div
            key={`h-${f}`}
            className="truncate px-1 py-2 text-center font-medium text-muted"
            title={f}
          >
            {f}
          </div>
        ))}

        {/* body */}
        {fields.map((rowField, i) => (
          <Row
            key={`r-${rowField}`}
            rowField={rowField}
            values={matrix[i]}
            fields={fields}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span>−1</span>
        <span className="h-2 w-32 rounded-full bg-[linear-gradient(to_right,rgba(251,113,133,0.9),rgba(124,92,252,0.12),rgba(124,92,252,0.9))]" />
        <span>+1</span>
        <span className="ml-2">{t("corrUndef")}</span>
      </div>
    </div>
  );
}

function Row({
  rowField,
  values,
  fields,
}: {
  rowField: string;
  values: (number | null)[];
  fields: string[];
}) {
  return (
    <>
      <div
        className="flex items-center truncate px-1 py-2 font-medium text-muted"
        title={rowField}
      >
        {rowField}
      </div>
      {values.map((r, j) => (
        <div
          key={`c-${rowField}-${fields[j]}`}
          className="flex aspect-square items-center justify-center rounded-[3px] tabular-nums text-foreground"
          style={{ background: colorFor(r) }}
          title={`${rowField} × ${fields[j]}: ${r === null ? "—" : r.toFixed(2)}`}
        >
          {r === null ? "—" : r.toFixed(2)}
        </div>
      ))}
    </>
  );
}
