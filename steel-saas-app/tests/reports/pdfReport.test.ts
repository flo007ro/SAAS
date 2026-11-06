import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { generatePdfReport, type ReportMeta } from "../../src/reports/generatePdf";
import { designResultSchema, type DesignResult, type BeamChecks } from "../../src/domain/resultContract";
import { buildReportModelFromResultJson } from "../../src/reports/reportModel";
import { PdfReport } from "../../src/reports/pdfReport";
import { isValidElement, type ReactNode } from "react";

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

    // Binary compressed data may itself end in CR. Use the declared byte length,
    // never infer a CRLF separator and accidentally truncate the zlib checksum.
    const dictionaryStart = buf.lastIndexOf(Buffer.from("<<"), streamAt);
    const dictionary = buf.subarray(dictionaryStart, streamAt).toString("latin1");
    const length = /\/Length\s+(\d+)\b/.exec(dictionary);
    if (!length) throw new Error("Expected a direct PDF stream length");
    const endAt = dataStart + Number(length[1]);

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
    } catch (error) { throw new Error(`PDF stream decode failed at ${dataStart}, length ${endAt - dataStart}: ${String(error)}`); }

    const endMarker = buf.indexOf(Buffer.from("endstream"), endAt);
    if (endMarker === -1) throw new Error("Missing PDF stream terminator");
    pos = endMarker + "endstream".length;
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
  const checks: BeamChecks = {
    flexure: { status: "pass", summary: "Flexure satisfied" },
    shear: { status: "pass", summary: "Shear satisfied" },
    sectionClassification: { status: "pass", summary: "Compact section" },
    lateralTorsionalBuckling: { status: "pass", summary: "Bracing verified" },
    deflection: { status: "pass", summary: "Serviceability satisfied" },
  };

  it.each([["kN-m", "kN"], ["kip-ft", "kip"]])("renders neutral legacy diagnostics with saved %s/%s units and no adequacy verdict", async (momentUnit, shearUnit) => {
    const result: DesignResult = { ...beamResult,
      beamChecks: Object.fromEntries(Object.keys(checks).map(key => [key, { status: "not_checked", summary: "Assessment unavailable" }])) as BeamChecks,
      displayInputSnapshot: { ...beamResult.displayInputSnapshot,
        factoredMoment: { label: "Factored moment", value: 10, unit: momentUnit }, factoredShear: { label: "Factored shear", value: 5, unit: shearUnit } },
      displayResults: { pass: false, legacyElasticMomentCapacity: 125, legacySimplifiedShearCapacity: 80, legacyElasticMomentDCR: 0.5, legacySimplifiedShearDCR: 1.5 },
    };
    const diagnosticBuffer = await generatePdfReport(result, meta);
    const text = extractPdfText(diagnosticBuffer);
    expect(text).toContain("LEGACY DIAGNOSTICS");
    expect(text).toContain(`125 ${momentUnit}`);
    expect(text).toContain(`80 ${shearUnit}`);
    expect(text).toContain("Uses original catalog Fy");
    expect(text).toContain("do not establish full flexure or shear adequacy");
    expect(text).toContain("Engineering review required");
    expect(text).not.toContain("Implemented checks pass");
    const rows: Array<{ label: string; pass?: boolean }> = [];
    function visit(node: ReactNode) {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!isValidElement(node)) return;
      const props = node.props as { label?: string; pass?: boolean; children?: ReactNode };
      if (props.label?.startsWith("Legacy ")) rows.push({ label: props.label, pass: props.pass });
      visit(props.children);
    }
    visit(PdfReport({ result, meta }));
    expect(rows).toHaveLength(4);
    expect(rows.every(row => row.pass === undefined)).toBe(true);
    const model = buildReportModelFromResultJson(result);
    expect(model.legacyDiagnosticRows).toHaveLength(4);
    expect(model.resultRows.some(row => row.label.startsWith("legacy"))).toBe(false);
  }, 20_000);

  it.each(["pass", "fail", "not_checked"] as const)("preserves modern %s check statuses through schema and both report paths", async status => {
    const snapshot = {
      ...beamResult,
      beamChecks: { ...checks, flexure: { status, summary: "Authoritative flexure assessment", ratio: 1 } },
      displayResults: { pass: status !== "pass", momentDCR: 1 },
      sectionSnapshot: { designation: "W310x60", A: 7640, d: 310, bf: 205, tf: 12.7, tw: 9.4, Sx: 875000, ry: 49, Fy: 345, sectionDbVersion: "test", Ix: 136000000, Zx: 1000000, J: 200000, E: 200000, sourceNote: "Verified test source", propertySourceNote: "User Fy, assumed elastic E" },
    };
    const result = designResultSchema.parse(JSON.parse(JSON.stringify(snapshot)));
    expect(result.beamChecks).toEqual(snapshot.beamChecks);
    expect(result.sectionSnapshot?.Ix).toBe(136000000);
    const verdict = status === "pass" ? "Implemented checks pass" : status === "fail" ? "Implemented checks fail" : "Engineering review required";
    const model = buildReportModelFromResultJson(result);
    expect(model.resultRows).toContainEqual({ label: "Implemented checks", value: verdict });
    expect(model.beamCheckRows?.[0]).toMatchObject({ status, summary: "Authoritative flexure assessment" });
    const buffer = await generatePdfReport(result, meta);
    const text = extractPdfText(buffer);
    expect(text).toContain(verdict);
    expect(text).toContain("Authoritative flexure assessment");
    expect(text).toContain("Section classification");
    expect(text).toContain("Bracing verified");
    expect(text).toContain("136000000 mm^4");
    expect(text).toContain("200000 MPa");
    expect(text).toContain("User Fy, assumed elastic E");
    expect(text).not.toContain("elastic major-axis flexure and simplified shear only");
    expect(model.warnings.some(w => w.includes("Flexure not checked"))).toBe(status === "not_checked");
    expect(result).toEqual(snapshot);
  }, 20_000);

  it("keeps user-saved legacy scope lines in modern reports", async () => {
    const result = { ...beamResult, beamChecks: checks, calculationLines: ["Scope: user-saved legacy line"] };
    expect(extractPdfText(await generatePdfReport(result, meta))).toContain("Scope: user-saved legacy line");
    expect(buildReportModelFromResultJson(result).calculationLines).toEqual(result.calculationLines);
  }, 20_000);
  it("shows native imperial serviceability lengths from saved SI audit fields", async () => {
    const result: DesignResult = { ...beamResult, unitSystem: "imperial", beamChecks: checks,
      displayResults: { pass: false, liveDeflectionMm: 25.4, totalDeflectionMm: 50.8, liveLimitMm: 76.2, totalLimitMm: 101.6 },
    };
    const text = extractPdfText(await generatePdfReport(result, { ...meta, unitSystem: "Imperial" }));
    for (const value of ["1 in", "2 in", "3 in", "4 in"]) expect(text).toContain(value);
    expect(buildReportModelFromResultJson(result).serviceabilityRows?.[0]).toEqual({ label: "Live-load deflection", value: "1 in" });
  }, 20_000);
  it("renders math and optional-field placeholders using readable font-safe text", async () => {
    const result = { ...beamResult, calculationLines: ["M_r = φ × F_y · S_x − 1; π²; √(2); A₁ ≥ A₂ → PASS"] };
    const text = extractPdfText(await generatePdfReport(result, { ...meta, client: "—", location: "—" }));
    expect(text).toContain("M_r = phi * F_y * S_x - 1; pi^2; sqrt(2); A_1 >= A_2 -> PASS");
    expect(text).toContain("Client: -");
    expect(text).toContain("Location: -");
  }, 20_000);
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
    expect(text).toContain("Implemented checks pass");
    expect(text).toContain("lateral-torsional buckling");
    expect(text).toContain("0.399");
  }, 20_000);

  it("section 5 — FAIL badge when result passes=false", async () => {
    const text = extractPdfText(await generatePdfReport(beamResultWithWarning, meta));
    expect(text).toContain("Implemented checks fail");
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
  it("brace member PDF never turns a calculated-check pass into design approval", async () => {
    const result: DesignResult = { ...beamResult, moduleType: "brace",
      displayResults: { pass: true, designStatus: "requires_engineering_review", tensionDCR: .5, seismicReviewRequired: true },
      warnings: ["SEISMIC REVIEW REQUIRED: system qualification is not evaluated."],
    };
    const text = extractPdfText(await generatePdfReport(result, meta));
    expect(text).toContain("ENGINEERING REVIEW REQUIRED");
    expect(text).toContain("SEISMIC REVIEW REQUIRED");
    expect(text).not.toMatch(/\bPASS\b/);
  }, 20_000);

});
