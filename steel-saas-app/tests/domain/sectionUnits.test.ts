import { describe, expect, it } from "vitest";
import { convertSectionUnits } from "../../src/domain/sections/sectionUnits";
import { sectionFixturesV1, sectionSeedV1 } from "../../src/domain/sections/sectionSeed.v1";
import { parseSectionOptions, buildRunInput } from "../../src/domain/runForm";
import { validateRunInput } from "../../src/engine/runInputValidation";
import { runBeamEngine } from "../../src/engine/beamEngineRunner";

describe("dimensionally equivalent section views", () => {
  it("converts US lengths, powers, stresses and weight per length with independent factors", () => {
    const source = { ...sectionFixturesV1[2], depth: 1, flangeWidth: 2, webThickness: 0.25,
      flangeThickness: 0.5, area: 2, sx: 3, sy: 4, ix: 4, iy: 5, rx: 2, ry: 1, fy: 50, weightOrMass: 40 };
    const metric = convertSectionUnits(source, "metric");
    expect(metric.depth).toBe(25.4);
    expect(metric.flangeWidth).toBe(50.8);
    expect(metric.area).toBeCloseTo(1290.32, 8);
    expect(metric.sx).toBeCloseTo(49161.192, 6);
    expect(metric.ix).toBeCloseTo(1664925.7024, 5);
    expect(metric.fy).toBeCloseTo(344.7378646584, 7);
    expect(metric.weightOrMass).toBeCloseTo(59.5265577428, 7);
    expect(metric).toMatchObject({ designation: source.designation, standard: source.standard,
      sectionDbVersion: source.sectionDbVersion, unitSystem: "metric" });
    expect(source.depth).toBe(1);
  });
  it.each(sectionFixturesV1)("round-trips $designation without relabelling standards or changing physical stiffness", source => {
    const other = convertSectionUnits(source, source.unitSystem === "metric" ? "imperial" : "metric");
    const back = convertSectionUnits(other, source.unitSystem);
    for (const key of ["area", "weightOrMass", "depth", "flangeWidth", "webThickness", "flangeThickness", "sx", "ix", "rx", "ry", "fy", "sy", "iy"] as const) {
      if (source[key] !== undefined) expect(Math.abs(back[key]! / source[key]! - 1)).toBeLessThan(1e-12);
    }
    expect(other.standard).toBe(source.standard);
    expect(other.designation).toBe(source.designation);
    expect(other.sectionDbVersion).toBe(source.sectionDbVersion);
    expect(other.sourceNote).toContain(source.sourceNote);
  });
  it("preserves flexural capacity, axial yield capacity and geometric slenderness across units", () => {
    const us = sectionFixturesV1[2];
    const si = convertSectionUnits(us, "metric");
    expect(si.fy * si.sx / (us.fy * us.sx)).toBeCloseTo(112984.8290276, 6);
    expect(si.fy * si.area / (us.fy * us.area)).toBeCloseTo(4448.22161526, 7);
    expect((3048 / si.ry) / (120 / us.ry)).toBeCloseTo(1, 12);
    expect((si.ix / si.area) / (us.ix / us.area)).toBeCloseTo(645.16, 9);
  });
  it.each(["AISC_360_22", "CSA_S16_19"] as const)("offers %s to the form and engine in both unit systems", standard => {
    for (const unitSystem of ["metric", "imperial"] as const) {
      const options = parseSectionOptions(sectionSeedV1, standard, unitSystem);
      expect(options.length).toBeGreaterThan(0);
      const section = validateRunInput("beam", { codeProfile: standard, unitSystem },
        buildRunInput("beam", unitSystem, standard, { factoredMoment: "1", factoredShear: "1" }, options[0].designation));
      expect(section.standard).toBe(standard);
      expect(section.unitSystem).toBe(unitSystem);
    }
  });
  it.each(["AISC_360_22", "CSA_S16_19"] as const)("preserves %s beam demand/capacity ratios for physically equivalent loads", standard => {
    const designation = standard === "AISC_360_22" ? "W12x40" : "W310x39";
    const us = runBeamEngine("us", { codeProfile: standard, unitSystem: "imperial" },
      buildRunInput("beam", "imperial", standard, { factoredMoment: "20", factoredShear: "10" }, designation));
    const si = runBeamEngine("si", { codeProfile: standard, unitSystem: "metric" },
      buildRunInput("beam", "metric", standard, { factoredMoment: "27.116358966628", factoredShear: "44.482216152605" }, designation));
    expect(si.displayResults.momentDCR).toBe(us.displayResults.momentDCR);
    expect(si.displayResults.shearDCR).toBe(us.displayResults.shearDCR);
    expect(si.sectionDbVersion).toBe(us.sectionDbVersion);
    expect(si.codeProfile).toBe(us.codeProfile);
  });
});
