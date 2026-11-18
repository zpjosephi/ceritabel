"use client";

import type { DataShape } from "@/lib/shape";
import { useLang } from "./LanguageProvider";

const ORDER: DataShape[] = ["cross-sectional", "timeseries", "panel"];
const LABEL: Record<DataShape, string> = {
  "cross-sectional": "shapeCross",
  timeseries: "shapeTs",
  panel: "shapePanel",
};

export default function ShapeSelector({
  value,
  detected,
  onChange,
}: {
  value: DataShape;
  detected: DataShape;
  onChange: (s: DataShape) => void;
}) {
  const { t } = useLang();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted">{t("shapeLabel")}:</span>
      <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-sm">
        {ORDER.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            aria-pressed={value === s}
            className={`relative rounded-md px-3 py-1 font-medium transition ${
              value === s
                ? "bg-surface-3 text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)]"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t(LABEL[s])}
            {detected === s ? (
              <span
                className="ml-1 text-xs font-normal text-muted"
              >
                ({t("shapeAuto")})
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
