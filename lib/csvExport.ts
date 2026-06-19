// lib/csvExport.ts
// Serialize a ParsedDataset back to CSV (RFC-4180 quoting). Used to download
// the cleaned data after the user's cleaning pipeline.

import type { ParsedDataset } from "./types";

function escape(v: string | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(ds: ParsedDataset): string {
  const header = ds.fields.map(escape).join(",");
  const rows = ds.rows.map((r) =>
    ds.fields.map((f) => escape(r[f] ?? null)).join(","),
  );
  return [header, ...rows].join("\n");
}
