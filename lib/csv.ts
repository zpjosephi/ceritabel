// lib/csv.ts
// Thin wrapper around PapaParse. Parsing happens entirely in the browser;
// raw rows never leave the client (privacy rule).

import Papa from "papaparse";
import type { ParsedDataset } from "./types";

export interface ParseOptions {
  /** Hard cap on rows kept in memory (protects against huge files). */
  maxRows?: number;
}

export class CsvParseError extends Error {}

/**
 * Parse a CSV File into a ParsedDataset (header row → field names, all cells
 * kept as trimmed strings or null). Returns a Promise.
 */
export function parseCsvFile(
  file: File,
  options: ParseOptions = {},
): Promise<ParsedDataset> {
  const { maxRows = 100_000 } = options;

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false, // keep everything as strings; we detect types ourselves
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        try {
          const fields = (results.meta.fields ?? [])
            .map((f) => f?.trim())
            .filter((f): f is string => !!f);

          if (fields.length === 0) {
            reject(
              new CsvParseError(
                "Tidak menemukan kolom. Pastikan baris pertama berisi nama kolom (header).",
              ),
            );
            return;
          }

          const rawRows = results.data.slice(0, maxRows);
          const rows = rawRows.map((row) => {
            const out: Record<string, string | null> = {};
            for (const field of fields) {
              const v = row[field];
              out[field] =
                v === undefined || v === null ? null : String(v).trim();
            }
            return out;
          });

          if (rows.length === 0) {
            reject(
              new CsvParseError("File CSV tidak punya baris data."),
            );
            return;
          }

          resolve({ fields, rows });
        } catch (err) {
          reject(
            new CsvParseError(
              err instanceof Error ? err.message : "Gagal memproses file CSV.",
            ),
          );
        }
      },
      error: (err) => {
        reject(new CsvParseError(err.message || "Gagal membaca file CSV."));
      },
    });
  });
}
