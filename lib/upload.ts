// lib/upload.ts
// Unified upload entry point: accepts CSV *or* Excel and returns one or more
// sheets parsed into the SAME ParsedDataset shape used everywhere else. Excel
// is parsed with SheetJS entirely in the browser — nothing is uploaded.

import * as XLSX from "xlsx";
import type { ParsedDataset } from "./types";
import { parseCsvFile, CsvParseError } from "./csv";

export interface SheetData {
  name: string;
  dataset: ParsedDataset;
}

export interface UploadResult {
  kind: "csv" | "excel";
  sheets: SheetData[];
}

function cellToString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Convert one worksheet into a ParsedDataset (header row → field names). */
function sheetToDataset(ws: XLSX.WorkSheet): ParsedDataset {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false, // use formatted text (dates/numbers as displayed)
    defval: null,
    blankrows: false,
  });
  if (aoa.length === 0) return { fields: [], rows: [] };

  const headerRow = aoa[0] ?? [];
  const fields: string[] = [];
  const used = new Set<string>();
  headerRow.forEach((h, i) => {
    let name = h === null || h === undefined ? "" : String(h).trim();
    if (!name) name = `Column ${i + 1}`;
    let unique = name;
    let k = 2;
    while (used.has(unique)) unique = `${name} (${k++})`;
    used.add(unique);
    fields.push(unique);
  });

  const rows: Record<string, string | null>[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const arr = aoa[r] ?? [];
    const obj: Record<string, string | null> = {};
    fields.forEach((f, i) => {
      obj[f] = cellToString(arr[i]);
    });
    if (Object.values(obj).every((v) => v === null)) continue; // skip empty rows
    rows.push(obj);
  }
  return { fields, rows };
}

export async function parseUpload(file: File): Promise<UploadResult> {
  const lower = file.name.toLowerCase();
  const isExcel =
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsm");

  if (isExcel) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheets: SheetData[] = [];
    for (const sn of wb.SheetNames) {
      const ds = sheetToDataset(wb.Sheets[sn]);
      if (ds.fields.length > 0 && ds.rows.length > 0) {
        sheets.push({ name: sn, dataset: ds });
      }
    }
    if (sheets.length === 0) {
      throw new CsvParseError("File Excel tidak punya sheet berisi data.");
    }
    return { kind: "excel", sheets };
  }

  // CSV path (reuses the existing PapaParse wrapper).
  const ds = await parseCsvFile(file);
  return { kind: "csv", sheets: [{ name: file.name, dataset: ds }] };
}
