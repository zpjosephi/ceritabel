// lib/csvExport.test.ts
import { describe, it, expect } from "vitest";
import { toCsv } from "./csvExport";

describe("toCsv", () => {
  it("writes header + rows, blanks for missing", () => {
    const csv = toCsv({
      fields: ["a", "b"],
      rows: [
        { a: "1", b: "x" },
        { a: "2", b: null },
      ],
    });
    expect(csv).toBe("a,b\n1,x\n2,");
  });

  it("quotes values with commas, quotes and newlines", () => {
    const csv = toCsv({
      fields: ["name", "note"],
      rows: [{ name: "Doe, John", note: 'say "hi"' }],
    });
    expect(csv).toBe('name,note\n"Doe, John","say ""hi"""');
  });
});
