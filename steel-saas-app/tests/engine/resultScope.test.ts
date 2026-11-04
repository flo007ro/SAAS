import { describe, expect, it } from "vitest";
import { calculateBeamDesign } from "../../src/engine/beamDesign";
import { calculateColumnDesign } from "../../src/engine/columnDesign";
import { calculateBasePlateDesign } from "../../src/engine/basePlateDesign";
import { buildReportModelFromResultJson } from "../../src/reports/reportModel";
import type { SteelSection } from "../../src/domain/sections/sectionTypes";

const section: SteelSection = {
  designation: "test W", standard: "CSA_S16_19", unitSystem: "metric", sectionDbVersion: "test",
  family: "W", area: 7640, weightOrMass: 60, depth: 310, flangeWidth: 205,
  webThickness: 9.4, flangeThickness: 12.7, sx: 875000, ix: 136000000, rx: 133, ry: 49, fy: 345, sourceNote: "test fixture",
};

function results(codeProfile: "CSA_S16_19" | "AISC_360_22", overload = false) {
  const common = { runId: "test", codeProfile, unitSystem: "metric" as const, section };
  const compression = { label: "Factored compression, C_f", value: overload ? 1e8 : 100, unit: "kN" as const };
  return [
    calculateBeamDesign({ ...common, factoredMoment: { label: "Factored moment, M_f", value: overload ? 1e8 : 10, unit: "kN-m" }, factoredShear: { label: "Factored shear, V_f", value: 10, unit: "kN" } }),
    calculateColumnDesign({ ...common, factoredCompression: compression, effectiveLength: { label: "KL", value: 3000, unit: "mm" } }),
    calculateBasePlateDesign({ ...common, factoredCompression: compression, plateN: { label: "N", value: 450, unit: "mm" }, plateB: { label: "B", value: 400, unit: "mm" }, concreteStrength: { label: "Concrete", value: 28, unit: "MPa" }, plateFy: { label: "Plate Fy", value: 250, unit: "MPa" } }),
  ];
}

describe("implemented result scope", () => {
  it.each(["CSA_S16_19", "AISC_360_22"] as const)("propagates omitted checks without altering capacity verdicts for %s", (code) => {
    const passing = results(code);
    const omitted = [/classification.*lateral-torsional buckling.*deflection/i, /local.*torsional.*combined bending/i, /supplied thickness.*anchors.*welds.*uplift.*moment/i];
    passing.forEach((result, i) => {
      expect(result.displayResults.pass).toBe(true);
      expect(result.warnings.join(" ")).toMatch(omitted[i]);
      expect(buildReportModelFromResultJson(result).warnings.join(" ")).toMatch(omitted[i]);
    });
    results(code, true).forEach((result) => expect(result.displayResults.pass).toBe(false));
  });

  it.each(["CSA_S16_19", "AISC_360_22"] as const)("uses %s demand notation independent of metric units and supplied labels", (code) => {
    const [beam, column, plate] = results(code);
    const aisc = code === "AISC_360_22";
    expect(beam.displayInputSnapshot.factoredMoment.label).toContain(aisc ? "M_u" : "M_f");
    expect(beam.displayInputSnapshot.factoredShear.label).toContain(aisc ? "V_u" : "V_f");
    for (const result of [column, plate]) {
      expect(result.displayInputSnapshot.factoredCompression.label).toContain(aisc ? "P_u" : "C_f");
    }
    expect(beam.calculationLines.join(" ")).toContain(aisc ? "M_u" : "M_f");
    expect(beam.calculationLines.join(" ")).toContain(aisc ? "V_u" : "V_f");
    for (const result of [column, plate]) expect(result.calculationLines.join(" ")).toContain(aisc ? "P_u" : "C_f");
  });

  it("makes legacy report scope explicit and labels saved AISC demands correctly without mutation", () => {
    const legacy = results("AISC_360_22")[0];
    legacy.warnings = [];
    legacy.displayInputSnapshot.factoredMoment.label = "Factored moment, M_f";
    const report = buildReportModelFromResultJson(legacy);
    expect(report.warnings.join(" ")).toMatch(/lateral-torsional buckling/);
    expect(report.inputRows[0].label).toContain("M_u");
    expect(report.resultRows).toContainEqual({ label: "Implemented checks", value: "Implemented checks pass" });
    expect(legacy.warnings).toEqual([]);
    expect(legacy.displayInputSnapshot.factoredMoment.label).toContain("M_f");
  });
});
