// lib/cleaning.test.ts
import { describe, it, expect } from "vitest";
import {
  dropDuplicates,
  fillMissing,
  normalizeCategory,
  dropColumn,
  replay,
  recommendedActions,
} from "./cleaning";
import { analyzeDataset } from "./stats";
import { scanDataQuality } from "./dataQuality";
import type { ParsedDataset } from "./types";

const ds = (rows: Record<string, string | null>[], fields: string[]): ParsedDataset => ({
  fields,
  rows,
});

describe("dropDuplicates", () => {
  it("removes exact duplicate rows, keeps first", () => {
    const d = ds(
      [
        { a: "1", b: "x" },
        { a: "1", b: "x" },
        { a: "2", b: "y" },
      ],
      ["a", "b"],
    );
    const r = dropDuplicates(d);
    expect(r.dataset.rows.length).toBe(2);
    expect(r.change?.meta.removed).toBe(1);
  });
  it("no-op returns null change", () => {
    const d = ds([{ a: "1" }, { a: "2" }], ["a"]);
    expect(dropDuplicates(d).change).toBeNull();
  });
});

describe("fillMissing", () => {
  const d = ds(
    [{ x: "10" }, { x: "" }, { x: "NA" }, { x: "20" }, { x: "30" }],
    ["x"],
  );
  it("median fill replaces missing with the median of present values", () => {
    const r = fillMissing(d, "x", "median");
    // present = [10,20,30] → median 20
    expect(r.change?.meta.value).toBe("20");
    expect(r.dataset.rows.map((row) => row.x)).toEqual([
      "10",
      "20",
      "20",
      "20",
      "30",
    ]);
  });
  it("mean fill", () => {
    const r = fillMissing(d, "x", "mean");
    expect(r.change?.meta.value).toBe("20"); // (10+20+30)/3
  });
  it("drop removes rows that are missing in the column", () => {
    const r = fillMissing(d, "x", "drop");
    expect(r.dataset.rows.length).toBe(3);
  });
  it("mode fill uses most frequent value", () => {
    const dc = ds([{ c: "a" }, { c: "a" }, { c: "" }, { c: "b" }], ["c"]);
    const r = fillMissing(dc, "c", "mode");
    expect(r.change?.meta.value).toBe("a");
  });
});

describe("normalizeCategory", () => {
  it("merges case/whitespace variants to the most frequent form", () => {
    const d = ds(
      [
        { city: "Jakarta" },
        { city: "Jakarta" },
        { city: "jakarta " },
        { city: "JAKARTA" },
      ],
      ["city"],
    );
    const r = normalizeCategory(d, "city");
    expect(r.dataset.rows.every((row) => row.city === "Jakarta")).toBe(true);
    expect(r.change?.meta.changed).toBe(2);
  });
});

describe("dropColumn", () => {
  it("removes the field and its cells", () => {
    const d = ds([{ a: "1", b: "2" }], ["a", "b"]);
    const r = dropColumn(d, "b");
    expect(r.dataset.fields).toEqual(["a"]);
    expect(r.dataset.rows[0]).toEqual({ a: "1" });
  });
});

describe("replay + undo semantics", () => {
  it("replaying a prefix of actions = undo of the last action", () => {
    const original = ds(
      [
        { a: "1", b: "x" },
        { a: "1", b: "x" },
        { a: "2", b: "" },
      ],
      ["a", "b"],
    );
    const actions = [
      { op: "dropDuplicates" as const },
      { op: "fillMissing" as const, column: "b", strategy: "mode" as const },
    ];
    const full = replay(original, actions);
    expect(full.changes.length).toBe(2);
    // undo = replay without the last action
    const undone = replay(original, actions.slice(0, -1));
    expect(undone.changes.length).toBe(1);
    expect(undone.dataset.rows.length).toBe(2);
  });
});

describe("recommendedActions (deterministic auto-clean)", () => {
  it("builds a sensible plan from the quality report", () => {
    const d = ds(
      [
        { city: "Jakarta", score: "10", dead: "1" },
        { city: "jakarta ", score: "", dead: "1" },
        { city: "Bandung", score: "30", dead: "1" },
        { city: "Jakarta", score: "10", dead: "1" }, // duplicate-ish
      ],
      ["city", "score", "dead"],
    );
    const report = scanDataQuality(d, analyzeDataset(d));
    const plan = recommendedActions(report);
    const ops = plan.map((a) => a.op);
    expect(ops).toContain("normalizeCategory");
    expect(ops).toContain("dropColumn"); // 'dead' is constant
    expect(ops).toContain("fillMissing");
  });
});
