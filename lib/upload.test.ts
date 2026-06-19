// lib/upload.test.ts
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseUpload } from "./upload";

function makeXlsx(
  sheets: { name: string; aoa: (string | number | null)[][] }[],
): File {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.aoa), s.name);
  }
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buf], "test.xlsx");
}

describe("parseUpload — Excel", () => {
  it("parses an .xlsx into the ParsedDataset shape", async () => {
    const file = makeXlsx([
      {
        name: "Data",
        aoa: [
          ["age", "city"],
          [20, "Jakarta"],
          [30, "Bandung"],
        ],
      },
    ]);
    const res = await parseUpload(file);
    expect(res.kind).toBe("excel");
    expect(res.sheets).toHaveLength(1);
    expect(res.sheets[0].dataset.fields).toEqual(["age", "city"]);
    expect(res.sheets[0].dataset.rows).toEqual([
      { age: "20", city: "Jakarta" },
      { age: "30", city: "Bandung" },
    ]);
  });

  it("returns every non-empty sheet for a multi-sheet workbook", async () => {
    const file = makeXlsx([
      { name: "One", aoa: [["a"], ["1"]] },
      { name: "Empty", aoa: [] },
      { name: "Two", aoa: [["b"], ["2"], ["3"]] },
    ]);
    const res = await parseUpload(file);
    const names = res.sheets.map((s) => s.name);
    expect(names).toContain("One");
    expect(names).toContain("Two");
    expect(names).not.toContain("Empty");
  });

  it("names blank header cells and keeps missing cells as null", async () => {
    const file = makeXlsx([
      { name: "S", aoa: [["x", null], ["1", "keep"], ["2", null]] },
    ]);
    const res = await parseUpload(file);
    const ds = res.sheets[0].dataset;
    expect(ds.fields[0]).toBe("x");
    expect(ds.fields[1]).toBe("Column 2");
    expect(ds.rows[1]["Column 2"]).toBeNull();
  });
});

// Note: the CSV path uses PapaParse's File reader (browser FileReader), which
// isn't available under Node/vitest, so it's covered by the live app rather
// than a unit test here.
