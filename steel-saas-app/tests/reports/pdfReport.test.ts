import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { generatePdfReport, type ReportMeta } from "../../src/reports/generatePdf";
import type { DesignResult } from "../../src/domain/resultContract";

// ── PDF text extractor ────────────────────────────────────────────────────────
// @react-pdf/renderer encodes text as hex strings inside TJ arrays:
//   [<4272696467> -10 <652052657472> ...] TJ
// Each <hexNN> is a run of WinAnsiEncoding bytes; numbers between are kerning.
// Strategy: decompress each FlateDecode stream, collect all <hex> tokens,
// decode them to latin1 and concatenate — spaces are encoded as 0x20 inside
// the hex runs so joins are naturally space-aware.

function extractPdfText(buf: Buffer): string {
  const STREAM_CRLF = Buffer.from("stream\r\n");
  const STREAM_LF   = Buffer.from("stream\n");
  const END_CRLF    = Buffer.from("\r\nendstream");
  const END_LF      = Buffer.from("\nendstream");

  const parts: string[] = [];
  let pos = 0;

  while (pos < buf.length) {
    const a = buf.indexOf(STREAM_CRLF, pos);
    const b = buf.indexOf(STREAM_LF, pos);

    let streamAt = -1, skip = 0;
    if (a !== -1 && (b === -1 || a <= b)) { streamAt = a; skip = STREAM_CRLF.length; }
    else if (b !== -1)                     { streamAt = b; skip = STREAM_LF.length;   }
    else break;

    const dataStart = streamAt + skip;

    // prefer CRLF end-marker to avoid including the trailing \r in the data
    let endAt = buf.indexOf(END_CRLF, dataStart);
    let endSkip = END_CRLF.length;
    if (endAt === -1) { endAt = buf.indexOf(END_LF, dataStart); endSkip = END_LF.length; }
    if (endAt === -1) break;

    try {
      const decoded = inflateSync(buf.subarray(dataStart, endAt)).toString("latin1");

      // hex strings from TJ arrays: <4e2f...>
      for (const m of decoded.matchAll(/<([0-9a-fA-F]{2,})>/g)) {
        if (m[1].length % 2 === 0) {
          parts.push(Buffer.from(m[1], "hex").toString("latin1"));
        }
      }

      // parenthesised strings (older generators / uncompressed objects)
      for (const m of decoded.matchAll(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g)) {
        parts.push(m[1]);
      }
    } catch { /* not a zlib stream */ }

    pos = endAt + endSkip;
  }

  return parts.join("");
}

// ── fixtures ──────────────────────────────────────────────────────────────────

const beamResult: DesignResult = {
  runId: "run_pdf_test",
  moduleType: "beam",
  engineVersion: "engine-0.1.0",
  sectionDbVersion: "sections-0.1.0",
  codeProfile: "CSA_S16_19",
  unitSystem: "metric",
  demandMode: "user_factored_demands",
  displayInputSnapshot: {
    factoredMoment: { label: "Factored moment, M_f", value: 125, unit: "kN-m" },
    factoredShear:  { label: "Factored shear, V_f",  value: 80,  unit: "kN"   },
    selectedSection: { label: "Selected section", value: "W310x60", unit: "designation" },
  },
  normalizedInputs: { factoredMomentNmm: 125_000_000, factoredShearN: 80_000 },
  displayResults: { pass: true, governingRatio: 0.399, designMomentCapacity: 272.6 },
  calculationLines: [
    "M_f = 125 kN-m",
    "M_r = phi Fy Sx = 272.6 kN-m",
    "Demand/capacity = 0.399",
  ],
  warnings: [],
  codeReferences: ["CSA S16-19"],
};

const beamResultWithWarning: DesignResult = {
  ...beamResult,
  runId: "run_pdf_warn",
  displayResults: { ...beamResult.displayResults, pass: false, governingRatio: 1.25 },
  warnings: ["Demand label must visibly include Factored."],
};

const columnResult: DesignResult = {
  runId: "run_pdf_col",
  moduleType: "column",
  engineVersion: "engine-0.1.0",
  sectionDbVersion: "sections-0.1.0",
  codeProfile: "AISC_360_22",
  unitSystem: "imperial",
  demandMode: "user_factored_demands",
  displayInputSnapshot: {
    factoredCompression: { label: "Factored compression, P_u", value: 200, unit: "kip" },
    effectiveLength:     { label: "Effective length, KL",       value: 120, unit: "in"  },
    selectedSection: { label: "Selected section", value: "W12x40", unit: "designation" },
  },
  normalizedInputs: { slenderness: 62.2, elasticBucklingStress: 74.0 },
  displayResults: { pass: true, slenderness: 62.2, fe: 74.0, fcr: 37.7,
                    factoredResistance: 396.5, demandCapacityRatio: 0.504 },
  calculationLines: ["KL/r = 62.2", "Fe = 74.0 ksi", "phiPn = 396.5 kip"],
  warnings: [],
  codeReferences: ["AISC 360-22 Section E3"],
};

const meta: ReportMeta = {
  projectName: "Bridge Retrofit",
  client: "City of Testville",
  location: "Testville, ON",
  codeProfile: "CSA S16-19",
  unitSystem: "Metric",
  engineerName: "Jane Doe P.Eng.",
  engineerRegistration: "PEO 12345",
  reportDate: "2026-05-15",
  engineVersion: "engine-0.1.0",
  reportTimestamp: "2026-05-15T09:00:00.000Z",
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe("generatePdfReport", () => {
  it("returns a valid PDF buffer (magic bytes + non-trivial size)", async () => {
    const buf = await generatePdfReport(beamResult, meta);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  }, 20_000);

  it("section 1 — header contains project name and client", async () => {
    const text = extractPdfText(await generatePdfReport(beamResult, meta));
    expect(text).toContain("Bridge Retrofit");
    expect(text).toContain("City of Testville");
  }, 20_000);

  it("section 3 — input summary contains demand display values from result_json", async () => {
    const text = extractPdfText(await generatePdfReport(beamResult, meta));
    expect(text).toContain("Factored moment");
    expect(text).toContain("Factored shear");
  }, 20_000);

  it("section 4 — selected section designation is present", async () => {
    const text = extractPdfText(await generatePdfReport(beamResult, meta));
    expect(text).toContain("W310x60");
  }, 20_000);

  it("section 5 — PASS badge and governing ratio", async () => {
    const text = extractPdfText(await generatePdfReport(beamResult, meta));
    expect(text).toContain("PASS");
    expect(text).toContain("0.399");
  }, 20_000);

  it("section 5 — FAIL badge when result passes=false", async () => {
    const text = extractPdfText(await generatePdfReport(beamResultWithWarning, meta));
    expect(text).toContain("FAIL");
  }, 20_000);

  it("section 6 — warnings section heading present when warnings exist", async () => {
    const text = extractPdfText(await generatePdfReport(beamResultWithWarning, meta));
    expect(text).toContain("WARNINGS");
  }, 20_000);

  it("section 7 — code clause reference present", async () => {
    const text = extractPdfText(await generatePdfReport(beamResult, meta));
    expect(text).toContain("CSA S16-19");
  }, 20_000);

  it("section 8 — engine version present", async () => {
    const text = extractPdfText(await generatePdfReport(beamResult, meta));
    expect(text).toContain("engine-0.1.0");
  }, 20_000);

  it("section 9 — disclaimer text present", async () => {
    const text = extractPdfText(await generatePdfReport(beamResult, meta));
    expect(text).toContain("DISCLAIMER");
  }, 20_000);

  it("works for a column result with AISC code profile", async () => {
    const buf = await generatePdfReport(columnResult, {
      ...meta,
      codeProfile: "AISC 360-22",
      unitSystem: "Imperial",
    });
    expect(buf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    const text = extractPdfText(buf);
    expect(text).toContain("W12x40");
    expect(text).toContain("AISC 360-22 Section E3");
  }, 20_000);
});
