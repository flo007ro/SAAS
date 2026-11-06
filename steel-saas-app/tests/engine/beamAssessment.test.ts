import { describe, expect, it } from "vitest";
import { calculateBeamAssessment } from "../../src/engine/beamAssessment";
import { calculateBeamDesign } from "../../src/engine/beamDesign";
import { runBeamEngine } from "../../src/engine/beamEngineRunner";
import { sectionFixturesV1 } from "../../src/domain/sections/sectionSeed.v1";
import { designResultSchema } from "../../src/domain/resultContract";
import type { SteelSection } from "../../src/domain/sections/sectionTypes";

const section = sectionFixturesV1.find(s => s.designation === "W310x39")!;
const aisc = sectionFixturesV1.find(s => s.designation === "W12x40")!;
const display = (label: string, value: number | string, unit: string) => ({ label, value, unit });
function inputs(s = section, modern = true) {
  const metric = s.unitSystem === "metric";
  return {
    codeProfile: s.standard, unitSystem: s.unitSystem,
    displayValues: {
      selectedSection: display("Selected section", s.designation, "designation"),
      factoredMoment: display("Factored moment", 10, metric ? "kN-m" : "kip-ft"),
      factoredShear: display("Factored shear", 5, metric ? "kN" : "kip"),
      ...(modern ? {
        supportModel: display("Support", "simply_supported_udl", "category"),
        beamRestraint: display("Restraint", "unknown", "category"),
        span: display("Span", metric ? 6000 : 6000 / 25.4, metric ? "mm" : "in"),
        unbracedLength: display("Unbraced length", metric ? 3000 : 3000 / 25.4, metric ? "mm" : "in"),
        serviceDeadLoad: display("Service dead load", metric ? 1 : 1 / (4448.2216152605 / 304.8), metric ? "kN/m" : "kip/ft"),
        serviceLiveLoad: display("Service live load", metric ? 2 : 2 / (4448.2216152605 / 304.8), metric ? "kN/m" : "kip/ft"),
        liveDeflectionLimit: display("Live limit", 360, "ratio"),
        totalDeflectionLimit: display("Total limit", 240, "ratio"),
        materialYieldStrength: display("Material Fy", metric ? 250 : 250 / 6.894757293168361, metric ? "MPa" : "ksi"),
      } : {}),
    },
  };
}
function assess(s: SteelSection = section, input = inputs(s)) {
  const legacy = calculateBeamDesign({runId:"assessment-1",codeProfile:s.standard,unitSystem:s.unitSystem,section:s,
    factoredMoment:{label:"Factored moment",value:Number(input.displayValues.factoredMoment.value),unit:s.unitSystem==="metric"?"kN-m":"kip-ft"},
    factoredShear:{label:"Factored shear",value:5,unit:s.unitSystem==="metric"?"kN":"kip"}});
  return calculateBeamAssessment({ legacyResult: legacy, section: s, inputJson: input });
}

describe("beam assessment integration", () => {
  it("always supplies five checks and never promotes an absent assessment to a passing run", () => {
    const result=runBeamEngine("new-run",{codeProfile:section.standard,unitSystem:section.unitSystem},inputs(section,false));
    expect(Object.keys(result.beamChecks!)).toHaveLength(5);
    expect(Object.values(result.beamChecks!).every(check=>check.status==="not_checked")).toBe(true);
    expect(result.displayResults.pass).toBe(false);
    expect(result.engineVersion).not.toBe("engine-0.1.0");
    expect(result.warnings.some(w=>w.includes("not checked"))).toBe(true);
  });
  it("assesses CSA deflection but does not claim unsupported CSA strength or simplified shear", () => {
    const result=assess();
    expect(result.beamChecks).toMatchObject({deflection:{status:"pass"},flexure:{status:"not_checked"},shear:{status:"not_checked"},sectionClassification:{status:"not_checked"},lateralTorsionalBuckling:{status:"not_checked"}});
    expect(result.displayResults.pass).toBe(false);
    expect(result.calculationLines.some(l=>l.includes("deflection are not checked"))).toBe(false);
    expect(result.beamChecks?.shear.summary).toMatch(/simplified|unverified/i);
    expect(result.warnings.some(w=>w.includes("Deflection not checked"))).toBe(false);
  });
  it("checks deflection in imperial units using native inertia converted to mm^4", () => {
    const result=assess(aisc);
    const expected=5*2*6000**4/(384*200000*aisc.ix*25.4**4);
    expect(result.displayResults.liveDeflectionMm).toBeCloseTo(expected,10);
    expect(result.normalizedInputs.spanMm).toBeCloseTo(6000,8);
    expect(result.normalizedInputs.materialYieldStrengthMPa).toBeCloseTo(250,8);
    expect(result.displayResults.deflectionUnit).toBe("in");
    expect(result.displayResults.liveDeflection).toBeCloseTo(expected/25.4,10);
    expect(result.beamChecks?.deflection.summary).toContain(" in");
    expect(result.beamChecks?.lateralTorsionalBuckling.status).toBe("not_checked");
  });
  it("fails deflection on the actual unrounded ratio and leaves overall pass false", () => {
    const input=inputs();input.displayValues.serviceLiveLoad=display("Service live load",200,"kN/m");
    const result=assess(section,input);
    expect(result.beamChecks?.deflection.status).toBe("fail");
    expect(result.beamChecks?.deflection.ratio).toBeGreaterThan(1);
    expect(result.displayResults.pass).toBe(false);
  });
  it("keeps assessment display values and independent property-source snapshots through schema serialization", () => {
    const input=inputs();const result=assess(section,input);
    const parsed=designResultSchema.parse(JSON.parse(JSON.stringify(result)));
    expect(parsed.displayInputSnapshot.span).toEqual(input.displayValues.span);
    expect(parsed.displayInputSnapshot.materialYieldStrength).toEqual(input.displayValues.materialYieldStrength);
    expect(parsed.sectionSnapshot).toMatchObject({Ix:section.ix,E:200000,sourceNote:section.sourceNote});
    expect(parsed.displayInputSnapshot.sectionPropertySource.value).toBe(section.sourceNote);
    expect(parsed.normalizedInputs.elasticModulusMPa).toBe(200000);
    input.displayValues.span!.value=7;
    expect(result.displayInputSnapshot.span.value).toBe(6000);
    expect(result.normalizedInputs.materialYieldStrengthMPa).toBe(250);
    expect(result.sectionSnapshot?.Fy).toBe(250);
  });
  it("does not report the old section-Fy elastic capacity as a modern flexural capacity", () => {
    const result=assess();
    expect(result.displayResults.designMomentCapacity).toBeUndefined();
    expect(result.displayResults.momentDCR).toBeUndefined();
    expect(result.calculationLines.some(l=>l.includes("M_r ="))).toBe(false);
  });
  it("preserves simplified shear display numbers only as explicitly unverified diagnostics", () => {
    const result=assess();
    expect(Number(result.displayResults.legacySimplifiedShearCapacity)).toBeGreaterThan(0);
    expect(Number(result.displayResults.legacySimplifiedShearDCR)).toBeGreaterThan(0);
    expect(result.displayResults.designShearCapacity).toBeUndefined();
    expect(result.displayResults.shearDCR).toBeUndefined();
    expect(result.beamChecks?.shear.status).toBe("not_checked");
    expect(result.beamChecks?.shear.summary).toContain("unverified diagnostic");
  });
  it("rejects partial assessments and guards nonfinite section data", () => {
    const input=inputs();delete (input.displayValues as Record<string,unknown>).span;
    expect(()=>assess(section,input)).toThrow();
    expect(()=>assess({...section,ix:Infinity})).toThrow();
    expect(()=>assess({...section,ix:0})).toThrow();
  });
  it("uses governing AISC local/LTB strength with supplied material rather than legacy elastic strength", () => {
    const s={...aisc,zx:101,sx:88.9,iy:40.1,ry:1.65,j:1.24,cw:3040,rts:1.98,ho:17.4,bfOver2tf:6.6,hOverTw:43.1};
    const input=inputs(s);input.displayValues.beamRestraint=display("Restraint","verified","category");
    const result=assess(s,input);
    expect(result.beamChecks?.sectionClassification.status).toBe("pass");
    expect(result.beamChecks?.lateralTorsionalBuckling.status).toBe("pass");
    expect(result.beamChecks?.flexure.status).toBe("pass");
    expect(Number(result.displayResults.designMomentCapacity)).toBeGreaterThan(0);
    expect(result.normalizedInputs.aiscCb).toBe(1);
    expect(result.calculationLines.some(line=>/Cb.*1.*conservative/i.test(line))).toBe(true);
    expect(result.normalizedInputs.materialYieldStrengthMPa).toBeCloseTo(250);
    expect(result.displayResults.pass).toBe(false);
    expect(result.warnings.some(line=>line.includes("reviewed_listed_errata_2026_09_23"))).toBe(true);
    expect(result.warnings.some(line=>/errata.*pending|pending.*errata/i.test(line))).toBe(false);
    const stronger=structuredClone(input);stronger.displayValues.materialYieldStrength=display("Material Fy",50,"ksi");
    expect(Number(assess(s,stronger).displayResults.designMomentCapacity)).toBeGreaterThan(Number(result.displayResults.designMomentCapacity));
  });
  it("keeps AISC classification independent but full flexure unavailable for unknown restraint", () => {
    const s={...aisc,zx:101,sx:88.9,iy:40.1,ry:1.65,j:1.24,cw:3040,rts:1.98,ho:17.4,bfOver2tf:6.6,hOverTw:43.1};
    const result=assess(s);
    expect(result.beamChecks?.sectionClassification.status).toBe("pass");
    expect(result.beamChecks?.lateralTorsionalBuckling.status).toBe("not_checked");
    expect(result.beamChecks?.flexure.status).toBe("not_checked");
    expect(result.displayResults.designMomentCapacity).toBeUndefined();
  });
  it("never silently substitutes missing AISC plastic/torsional properties or unsupported slender elements", () => {
    const input=inputs(aisc);input.displayValues.beamRestraint=display("Restraint","verified","category");
    expect(assess(aisc,input).beamChecks?.flexure.status).toBe("not_checked");
    const s={...aisc,zx:101,sx:88.9,iy:40.1,ry:1.65,j:1.24,cw:3040,rts:1.98,ho:17.4,bfOver2tf:100,hOverTw:43.1};
    expect(assess(s,input).beamChecks?.flexure.status).toBe("not_checked");
  });
  it("keeps explicit Cb and section Fy source distinct from assessment Fy", () => {
    const input=inputs(aisc);Object.assign(input.displayValues,{aiscCb:display("Cb",1.4,"ratio")});
    const result=assess(aisc,input);
    expect(result.normalizedInputs.aiscCb).toBe(1.4);
    expect(result.displayInputSnapshot.aiscCb.value).toBe(1.4);
    expect(result.displayInputSnapshot.referenceSectionYieldStrength.value).toBe(aisc.fy);
    expect(result.normalizedInputs.referenceSectionYieldStrengthMPa).toBeCloseTo(aisc.fy*6.894757293168361,8);
    expect(result.sectionSnapshot?.Fy).not.toBe(aisc.fy);
  });
  it("separates flange-local failure from a passing LTB stage and presents native imperial summaries", () => {
    const inch=25.4, fy=250, root=Math.sqrt(200000/fy);
    const s={...aisc,zx:101,sx:88.9,iy:40.1,ry:1.65,j:1.24,cw:3040,rts:1.98,ho:17.4,bfOver2tf:16,hOverTw:43.1};
    const mp=fy*101*inch**3;
    const local=mp-(mp-.7*fy*88.9*inch**3)*(16-.38*root)/(.62*root);
    const input=inputs(s);input.displayValues.beamRestraint=display("Restraint","verified","category");
    input.displayValues.unbracedLength=display("Unbraced length",100/inch,"in");
    input.displayValues.factoredMoment=display("Factored moment",.9*(mp+local)/2/1355817.9483314,"kip-ft");
    const result=assess(s,input);
    expect(result.beamChecks?.flexure.status).toBe("fail");
    expect(result.beamChecks?.lateralTorsionalBuckling.status).toBe("pass");
    expect(result.beamChecks?.lateralTorsionalBuckling.ratio).toBeLessThan(1);
    expect(result.beamChecks?.lateralTorsionalBuckling.summary).toContain(" in");
    expect(result.beamChecks?.flexure.summary).toContain("kip-ft");
    expect(result.displayInputSnapshot.strengthApplicability.value).toContain("Explicit verified");
  });
});
