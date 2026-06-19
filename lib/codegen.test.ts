// lib/codegen.test.ts
import { describe, it, expect } from "vitest";
import { generatePython, generateR, type CodegenOptions } from "./codegen";

const base: CodegenOptions = {
  fileName: "data.csv",
  isExcel: false,
  excluded: ["id"],
  actions: [
    { op: "dropDuplicates" },
    { op: "fillMissing", column: "age", strategy: "median" },
    { op: "normalizeCategory", column: "city" },
    { op: "dropColumn", column: "note" },
  ],
  shape: "cross-sectional",
};

describe("Python codegen", () => {
  const code = generatePython(base);
  it("loads, drops excluded, and applies cleaning", () => {
    expect(code).toContain("pd.read_csv");
    expect(code).toContain('df = df.drop(columns=["id"])');
    expect(code).toContain("df = df.drop_duplicates()");
    expect(code).toContain('df["age"].median()');
    expect(code).toContain("df = df.drop(columns" + '=["note"])');
    expect(code).toContain("df.describe");
  });
  it("excel uses read_excel with sheet", () => {
    const c = generatePython({ ...base, isExcel: true, sheetName: "Sheet1" });
    expect(c).toContain("pd.read_excel");
    expect(c).toContain('sheet_name="Sheet1"');
  });
  it("time series block", () => {
    const c = generatePython({
      ...base,
      shape: "timeseries",
      timeCol: "month",
      valueCol: "sales",
      maWindow: 3,
    });
    expect(c).toContain('sort_values("month")');
    expect(c).toContain("rolling(3)");
  });
});

describe("R codegen", () => {
  const code = generateR(base);
  it("loads, drops excluded, and applies cleaning", () => {
    expect(code).toContain("read.csv");
    expect(code).toContain('df[["note"]] <- NULL');
    expect(code).toContain("!duplicated(df)");
    expect(code).toContain("median(df[[\"age\"]], na.rm = TRUE)");
    expect(code).toContain("cor(");
  });
  it("defines a mode helper only when needed", () => {
    const withMode = generateR({
      ...base,
      actions: [{ op: "fillMissing", column: "c", strategy: "mode" }],
    });
    expect(withMode).toContain(".mode <- function");
    expect(code).not.toContain(".mode <- function");
  });
});
