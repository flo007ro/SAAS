import { describe, expect, it } from "vitest";
import { parseBeamAssessmentInput } from "../../src/domain/beamAssessmentInput";

function fixture(codeProfile = "AISC_360_22", unitSystem = "metric") {
  const metric = unitSystem === "metric";
  const entry = (value: number | string, unit: string) => ({ label: "Engineer supplied", value, unit });
  return { codeProfile, unitSystem, displayValues: {
    supportModel: entry("simply_supported_udl", "category"),
    beamRestraint: entry("unknown", "category"),
    span: entry(100, metric ? "mm" : "in"),
    unbracedLength: entry(50, metric ? "mm" : "in"),
    serviceDeadLoad: entry(2, metric ? "kN/m" : "kip/ft"),
    serviceLiveLoad: entry(3, metric ? "kN/m" : "kip/ft"),
    liveDeflectionLimit: entry(360, "ratio"),
    totalDeflectionLimit: entry(240, "ratio"),
    materialYieldStrength: entry(50, metric ? "MPa" : "ksi"),
  } as Record<string, { label: string; value: unknown; unit: string }> };
}

describe("parseBeamAssessmentInput", () => {
  it("leaves legacy input without an assessment unchecked", () => {
    expect(parseBeamAssessmentInput({ displayValues: { factoredMoment: { value: 5 } } })).toBeUndefined();
    expect(parseBeamAssessmentInput({})).toBeUndefined();
  });
  it.each(["AISC_360_22", "CSA_S16_19"])("normalizes metric %s without defaults", code => {
    expect(parseBeamAssessmentInput(fixture(code))).toEqual({
      supportModel: "simply_supported_udl", beamRestraint: "unknown", spanMm: 100, unbracedLengthMm: 50,
      serviceDeadLoadNPerMm: 2, serviceLiveLoadNPerMm: 3,
      liveDeflectionLimit: 360, totalDeflectionLimit: 240, materialYieldStrengthMPa: 50,
    });
  });
  it.each(["AISC_360_22", "CSA_S16_19"])("normalizes imperial %s", code => {
    const result = parseBeamAssessmentInput(fixture(code, "imperial"))!;
    expect(result.spanMm).toBeCloseTo(2540, 10);
    expect(result.unbracedLengthMm).toBeCloseTo(1270, 10);
    expect(result.serviceDeadLoadNPerMm).toBeCloseTo(29.1878058744, 8);
    expect(result.materialYieldStrengthMPa).toBeCloseTo(344.7378646584, 8);
  });
  it.each(Object.keys(fixture().displayValues))("requires %s when the group is present", key => {
    const input = fixture(); delete input.displayValues[key];
    expect(() => parseBeamAssessmentInput(input)).toThrow(key);
  });
  it.each([null, undefined, "", "  ", true, {}, [], NaN, Infinity, -Infinity, "Infinity", "1e999", "0x10"])("rejects invalid numeric input %j", value => {
    const input = fixture(); input.displayValues.span.value = value;
    expect(() => parseBeamAssessmentInput(input)).toThrow("span");
  });
  it("accepts finite decimal numeric strings", () => {
    const input = fixture(); input.displayValues.span.value = " 1e3 ";
    expect(parseBeamAssessmentInput(input)?.spanMm).toBe(1000);
  });
  it.each(["span", "unbracedLength", "liveDeflectionLimit", "totalDeflectionLimit", "materialYieldStrength"])("requires positive %s", key => {
    for (const value of [0, -1]) {
      const input = fixture(); input.displayValues[key].value = value;
      expect(() => parseBeamAssessmentInput(input)).toThrow(key);
    }
  });
  it.each(Object.keys(fixture().displayValues))("rejects tampered %s units", key => {
    const input = fixture(); input.displayValues[key].unit = "wrong";
    expect(() => parseBeamAssessmentInput(input)).toThrow(key);
  });
  it("checks support model and context", () => {
    const input = fixture(); input.displayValues.supportModel.value = "cantilever";
    expect(() => parseBeamAssessmentInput(input)).toThrow("supportModel");
    expect(() => parseBeamAssessmentInput(fixture("unknown"))).toThrow("codeProfile");
    expect(() => parseBeamAssessmentInput(fixture("AISC_360_22", "unknown"))).toThrow("unitSystem");
  });
  it("preserves explicit restraint affirmation without inferring verification", () => {
    const input = fixture();
    expect(parseBeamAssessmentInput(input)?.beamRestraint).toBe("unknown");
    input.displayValues.beamRestraint.value = "verified";
    expect(parseBeamAssessmentInput(input)?.beamRestraint).toBe("verified");
    input.displayValues.beamRestraint.value = true;
    expect(() => parseBeamAssessmentInput(input)).toThrow("beamRestraint");
  });
  it("bounds unbraced length by span including equality", () => {
    const input = fixture(); input.displayValues.unbracedLength.value = 100;
    expect(parseBeamAssessmentInput(input)?.unbracedLengthMm).toBe(100);
    input.displayValues.unbracedLength.value = 101;
    expect(() => parseBeamAssessmentInput(input)).toThrow("unbracedLength");
  });
  it("allows zero individual service load but requires positive finite total", () => {
    const input = fixture(); input.displayValues.serviceDeadLoad.value = 0;
    expect(parseBeamAssessmentInput(input)?.serviceDeadLoadNPerMm).toBe(0);
    input.displayValues.serviceLiveLoad.value = 0;
    expect(() => parseBeamAssessmentInput(input)).toThrow("service");
    input.displayValues.serviceLiveLoad.value = -1;
    expect(() => parseBeamAssessmentInput(input)).toThrow("serviceLiveLoad");
    input.displayValues.serviceDeadLoad.value = Number.MAX_VALUE;
    input.displayValues.serviceLiveLoad.value = Number.MAX_VALUE;
    expect(() => parseBeamAssessmentInput(input)).toThrow("service");
  });
  it("rejects conversion overflow", () => {
    for (const key of ["span", "serviceDeadLoad", "materialYieldStrength"]) {
      const input = fixture("AISC_360_22", "imperial"); input.displayValues[key].value = Number.MAX_VALUE;
      expect(() => parseBeamAssessmentInput(input)).toThrow(key);
    }
  });
  it("accepts optional AISC-only Cb in [1,3] without supplying a default", () => {
    const input = fixture();
    expect(parseBeamAssessmentInput(input)).not.toHaveProperty("aiscCb");
    for (const value of [1, 2, 3]) {
      input.displayValues.aiscCb = { label: "Cb", value, unit: "ratio" };
      expect(parseBeamAssessmentInput(input)?.aiscCb).toBe(value);
    }
    for (const value of [0.99, 3.01, Infinity]) {
      input.displayValues.aiscCb.value = value;
      expect(() => parseBeamAssessmentInput(input)).toThrow("aiscCb");
    }
    input.codeProfile = "CSA_S16_19";
    expect(() => parseBeamAssessmentInput(input)).toThrow("aiscCb");
  });
  it("does not ignore ambiguous moment gradient semantics or lone Cb", () => {
    expect(() => parseBeamAssessmentInput({ displayValues: { aiscCb: { value: 1, unit: "ratio" } } })).toThrow();
    const input = fixture(); input.displayValues.momentGradientFactor = { label: "factor", value: 1, unit: "ratio" };
    expect(() => parseBeamAssessmentInput(input)).toThrow("momentGradientFactor");
  });
});
