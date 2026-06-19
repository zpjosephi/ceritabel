"use client";

import { toCsv } from "@/lib/csvExport";
import type { ParsedDataset } from "@/lib/types";
import { Card } from "./ui";
import { useLang } from "./LanguageProvider";

const LIMIT = 20;

export default function DataPreview({
  dataset,
  fileName,
}: {
  dataset: ParsedDataset;
  fileName: string;
}) {
  const { t } = useLang();
  const rows = dataset.rows.slice(0, LIMIT);

  function download() {
    const csv = toCsv(dataset);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = fileName.replace(/\.[^.]+$/, "") || "data";
    a.href = url;
    a.download = `${base}-clean.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">
          {t("previewShowing", { shown: rows.length, total: dataset.rows.length })}
        </span>
        <button
          onClick={download}
          className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-strong"
        >
          {t("downloadCsv")}
        </button>
      </div>

      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-2 text-left">
              {dataset.fields.map((f) => (
                <th
                  key={f}
                  className="whitespace-nowrap border-b border-border px-3 py-2 font-medium text-muted"
                >
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-surface-2/50">
                {dataset.fields.map((f) => (
                  <td
                    key={f}
                    className="whitespace-nowrap border-b border-border/50 px-3 py-1.5 text-foreground/90"
                  >
                    {r[f] ?? <span className="text-muted/50">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
