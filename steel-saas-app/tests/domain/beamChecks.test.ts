import { describe, expect, it } from "vitest";
import { beamChecksSchema } from "../../src/domain/resultContract";
import { beamChecksVerdict, beamServiceabilityRows, resultWarnings, RESULT_SCOPE } from "../../src/domain/resultPresentation";

export const passingChecks = {
  flexure: { status: "pass" as const, summary: "Flexure satisfied", ratio: 1 },
  shear: { status: "pass" as const, summary: "Shear satisfied" },
  sectionClassification: { status: "pass" as const, summary: "Compact" },
  lateralTorsionalBuckling: { status: "pass" as const, summary: "Braced" },
  deflection: { status: "pass" as const, summary: "Deflection satisfied" },
};

describe("modern beam checks", () => {
  it("displays serviceability lengths in project units without mutating SI audit values", () => {
    const displayResults = { liveDeflectionMm: 25.4, totalDeflectionMm: 50.8, liveLimitMm: 76.2, totalLimitMm: 101.6, liveDCR: 1 / 3, totalDCR: 0.5 };
    expect(beamServiceabilityRows({ displayResults, unitSystem: "imperial" }).slice(0, 4).map(row => row.value)).toEqual(["1 in", "2 in", "3 in", "4 in"]);
    expect(beamServiceabilityRows({ displayResults, unitSystem: "metric" })[0].value).toBe("25.4 mm");
    expect(beamServiceabilityRows({ displayResults: { ...displayResults, liveDeflection: 1.5 }, unitSystem: "imperial" })[0].value).toBe("1.5 in");
    expect(displayResults.liveDeflectionMm).toBe(25.4);
  });
  it("requires all entries, summaries, valid statuses and finite ratios", () => {
    expect(beamChecksSchema.safeParse(passingChecks).success).toBe(true);
    for (const checks of [
      { ...passingChecks, shear: undefined },
      { ...passingChecks, shear: { status: "checked", summary: "old" } },
      { ...passingChecks, shear: { status: "pass", summary: " " } },
      { ...passingChecks, shear: { status: "pass", summary: "x", ratio: Infinity } },
      { ...passingChecks, shear: { status: "pass", summary: "x", ratio: 2 } },
    ]) expect(beamChecksSchema.safeParse(checks).success).toBe(false);
  });
  it("uses authoritative statuses, with failures preceding omissions", () => {
    expect(beamChecksVerdict(passingChecks)).toBe("Implemented checks pass");
    expect(beamChecksVerdict({ ...passingChecks, flexure: { status: "fail", summary: "Unrounded ratio exceeds one", ratio: 1 } })).toBe("Implemented checks fail");
    expect(beamChecksVerdict({ ...passingChecks, shear: undefined })).toBe("Engineering review required");
    expect(beamChecksVerdict({ ...passingChecks, deflection: { status: "not_checked", summary: "No service loads" } })).toBe("Engineering review required");
    expect(beamChecksVerdict({ flexure: { status: "fail" } })).toBe("Implemented checks fail");
    expect(beamChecksVerdict({ ...passingChecks, flexure: { status: "pass", summary: "Malformed historical ratio", ratio: 2 } })).toBe("Engineering review required");
  });
  it("preserves legacy scope and saved content but derives modern omissions", () => {
    const saved = ["User warning", RESULT_SCOPE.beam!];
    const checks = { ...passingChecks, deflection: { status: "not_checked" as const, summary: "Service loads absent" } };
    expect(resultWarnings("beam", [])).toEqual([RESULT_SCOPE.beam]);
    expect(resultWarnings("beam", [], passingChecks)).toEqual([]);
    expect(resultWarnings("beam", [], checks)).toEqual(["Deflection not checked: Service loads absent"]);
    expect(resultWarnings("beam", saved, passingChecks)).toEqual(saved);
    expect(saved).toHaveLength(2);
  });
});
