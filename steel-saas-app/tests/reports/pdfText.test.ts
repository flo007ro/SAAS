import { describe, expect, it } from "vitest";
import { pdfText } from "../../src/reports/pdfText";

describe("PDF provenance text", () => {
  it("groups printed SHA-256 fingerprints without losing characters", () => {
    const hash = "e08bea15bbe475e78251292e5f543ff5a11d16b59c9d6af47aec700f8f57f050";
    const printed = pdfText(hash);
    expect(printed.split(" ").map(part => part.length)).toEqual([16, 16, 16, 16]);
    expect(printed.replaceAll(" ", "")).toBe(hash);
    expect(pdfText(`workbook SHA256 ${hash}.`)).toBe(`workbook SHA256 ${printed}.`);
  });

  it("does not modify normal calculation values or smaller identifiers", () => {
    expect(pdfText("324.2125198750402 kip-ft; W18x50; 1234567890123456")).toBe(
      "324.2125198750402 kip-ft; W18x50; 1234567890123456",
    );
  });
});
