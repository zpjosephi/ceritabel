"use client";

import { useSyncExternalStore } from "react";
import type { CorrelationMatrix } from "@/lib/types";
import { useLang } from "./LanguageProvider";

/* Negative pole: each accent theme ships its own best-opposing hue as
   --corr-neg (blue for the warm accents, warm orange for teal, violet for
   lime, ...), so + and - stay visually distinct whatever the theme. */
const CORR_NEG = "var(--corr-neg, #3b82f6)";

/* Colorblind-safe negative pole (fixed blue, paired with the fixed orange). */
const CORR_NEG_CVD = "#3b82f6";

/* Colorblind-safe positive pole: blue<->orange is the classic diverging pair
   that stays distinguishable across all common CVD types. Fixed on purpose:
   in safe mode the scale must NOT follow the themeable accent (a teal or lime
   accent would collapse the two poles for some viewers). Orange sits near the
   semantic warning hue, but here it encodes measurement, not caution; the
   trade-off is deliberate and only active in safe mode. */
const CORR_POS_CVD = "#f59e0b";

/* Colorblind-safe mode is a tiny cross-component setting; persisted in
   localStorage and broadcast with an event so every open heatmap follows. */
const CVD_KEY = "ceritabel-cvd-safe";
const CVD_EVENT = "ceritabel:cvdchange";

function subscribeCvd(cb: () => void) {
  window.addEventListener(CVD_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CVD_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function readCvd(): boolean {
  try {
    return localStorage.getItem(CVD_KEY) === "1";
  } catch {
    return false;
  }
}
function writeCvd(v: boolean) {
  try {
    localStorage.setItem(CVD_KEY, v ? "1" : "0");
  } catch {
    /* private mode: the toggle still works for this render via the event */
  }
  window.dispatchEvent(new Event(CVD_EVENT));
}

/**
 * Diverging color for a Pearson r in [-1, 1]:
 *  negative -> cool blue, 0 -> neutral surface, positive -> the live accent
 *  (or a fixed orange when colorblind-safe mode is on).
 */
function colorFor(r: number | null, cvdSafe: boolean): string {
  if (r === null) return "transparent";
  const mag = Math.min(1, Math.abs(r));
  const pct = (0.12 + mag * 0.78) * 100;
  const pos = cvdSafe ? CORR_POS_CVD : "var(--accent)";
  const neg = cvdSafe ? CORR_NEG_CVD : CORR_NEG;
  const base = r >= 0 ? pos : neg;
  return `color-mix(in srgb, ${base} ${pct}%, transparent)`;
}

export default function CorrelationHeatmap({
  cm,
}: {
  cm: CorrelationMatrix;
}) {
  const { t } = useLang();
  const cvdSafe = useSyncExternalStore(subscribeCvd, readCvd, () => false);
  const { fields, matrix } = cm;
  if (fields.length < 2) {
    return <p className="text-sm text-muted">{t("corrNeed2")}</p>;
  }

  const n = fields.length;
  const pos = cvdSafe ? CORR_POS_CVD : "var(--accent)";
  const neg = cvdSafe ? CORR_NEG_CVD : CORR_NEG;

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
            cvdSafe={cvdSafe}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>−1</span>
        <span
          className="h-2 w-32 rounded-full"
          style={{
            background: `linear-gradient(to right, color-mix(in srgb, ${neg} 90%, transparent), color-mix(in srgb, ${pos} 12%, transparent), color-mix(in srgb, ${pos} 90%, transparent))`,
          }}
        />
        <span>+1</span>
        <span className="ml-2">{t("corrUndef")}</span>
        <button
          type="button"
          aria-pressed={cvdSafe}
          onClick={() => writeCvd(!cvdSafe)}
          className={`ml-auto rounded-md border px-2 py-1 text-xs font-medium transition ${
            cvdSafe
              ? "border-accent/40 bg-accent/15 text-accent-strong"
              : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground"
          }`}
        >
          {t("corrCvdToggle")}
        </button>
      </div>
    </div>
  );
}

function Row({
  rowField,
  values,
  fields,
  cvdSafe,
}: {
  rowField: string;
  values: (number | null)[];
  fields: string[];
  cvdSafe: boolean;
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
          style={{ background: colorFor(r, cvdSafe) }}
          title={`${rowField} × ${fields[j]}: ${r === null ? "-" : r.toFixed(2)}`}
        >
          {r === null ? "-" : r.toFixed(2)}
        </div>
      ))}
    </>
  );
}
