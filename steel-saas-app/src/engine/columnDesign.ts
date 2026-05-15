import type { CodeProfile } from "../domain/codeProfiles";
import { validateFactoredDemandInput } from "../domain/demandInputHandling";
import type { DesignResult } from "../domain/resultContract";
import type { SteelSection } from "../domain/sections/sectionTypes";
import type { EngineeringUnit, UnitSystem, UnitValue } from "../domain/units";

export type ColumnDesignInput = {
  runId: string;
  codeProfile: CodeProfile;
  unitSystem: UnitSystem;
  section: SteelSection;
  factoredCompression: UnitValue & { label: string };
  effectiveLength: UnitValue & { label: string };
};

// ── helpers ──────────────────────────────────────────────────────────────────

function elasticModulus(unitSystem: UnitSystem): number {
  return unitSystem === "metric" ? 200_000 : 29_000; // MPa or ksi
}

// CSA S16-19 Clause 13.3.1 — Cr = φAgFy(1 + λ_n^2n)^(-1/n), n = 1.34 for W sections
function csaS16FactoredResistance(area: number, fy: number, fe: number): {
  cr: number;
  fcr: number;
  lambdaN: number;
} {
  const phi = 0.9;
  const n = 1.34;
  const lambdaN = Math.sqrt(fy / fe);
  const cr = phi * area * fy * Math.pow(1 + Math.pow(lambdaN, 2 * n), -1 / n);
  return { cr, fcr: cr / (phi * area), lambdaN };
}

// AISC 360-22 Section E3 — inelastic (E3-2) or elastic (E3-3) buckling
function aisc360FactoredResistance(area: number, fy: number, fe: number): {
  phiPn: number;
  fcr: number;
  bucklingMode: "inelastic" | "elastic";
} {
  const phi = 0.9;
  const fcr =
    fy / fe <= 2.25
      ? Math.pow(0.658, fy / fe) * fy // E3-2 inelastic
      : 0.877 * fe; // E3-3 elastic
  const bucklingMode: "inelastic" | "elastic" = fy / fe <= 2.25 ? "inelastic" : "elastic";
  return { phiPn: phi * area * fcr, fcr, bucklingMode };
}

// ── main function ─────────────────────────────────────────────────────────────

export function calculateColumnDesign(input: ColumnDesignInput): DesignResult {
  const demandChecks = [
    validateFactoredDemandInput({ key: "factoredCompression", ...input.factoredCompression }),
  ];
  const warnings = demandChecks.flatMap((c) => c.errors);

  const E = elasticModulus(input.unitSystem);
  const fy = input.section.fy;
  const ry = input.section.ry;
  const KL = input.effectiveLength.value;
  const slenderness = KL / ry;

  // Elastic buckling stress
  const fe = (Math.PI ** 2 * E) / slenderness ** 2;

  const resistanceUnit: EngineeringUnit = input.unitSystem === "metric" ? "kN" : "kip";
  const stressUnit = input.unitSystem === "metric" ? "MPa" : "ksi";

  let factoredResistance: number; // kN or kips
  let fcrDisplay: number; // MPa or ksi
  let codeClause: string;
  let calculationLines: string[];

  if (input.codeProfile === "CSA_S16_19") {
    const { cr, fcr, lambdaN } = csaS16FactoredResistance(input.section.area, fy, fe);
    factoredResistance = input.unitSystem === "metric" ? cr / 1000 : cr;
    fcrDisplay = Number(fcr.toFixed(1));
    codeClause = "CSA S16-19 Clause 13.3.1";
    calculationLines = [
      `C_f = ${input.factoredCompression.value} ${input.factoredCompression.unit}`,
      `KL = ${KL} ${input.effectiveLength.unit}, r_y = ${ry} ${input.unitSystem === "metric" ? "mm" : "in"}`,
      `KL/r = ${slenderness.toFixed(1)}`,
      `F_e = π²E/(KL/r)² = ${fe.toFixed(1)} ${stressUnit}`,
      `λ_n = √(F_y/F_e) = ${lambdaN.toFixed(3)}`,
      `C_r = φA·F_y·(1 + λ_n^{2n})^{-1/n} = ${factoredResistance.toFixed(1)} ${resistanceUnit}`,
      `C_f / C_r = ${(input.factoredCompression.value / factoredResistance).toFixed(3)}`,
    ];
  } else {
    const { phiPn, fcr, bucklingMode } = aisc360FactoredResistance(input.section.area, fy, fe);
    factoredResistance = input.unitSystem === "metric" ? phiPn / 1000 : phiPn;
    fcrDisplay = Number(fcr.toFixed(1));
    codeClause = "AISC 360-22 Section E3";
    calculationLines = [
      `P_u = ${input.factoredCompression.value} ${input.factoredCompression.unit}`,
      `KL = ${KL} ${input.effectiveLength.unit}, r_y = ${ry} ${input.unitSystem === "metric" ? "mm" : "in"}`,
      `KL/r = ${slenderness.toFixed(1)}`,
      `F_e = π²E/(KL/r)² = ${fe.toFixed(1)} ${stressUnit}`,
      `F_cr = ${fcr.toFixed(1)} ${stressUnit} (${bucklingMode} buckling, ${fy / fe <= 2.25 ? "E3-2" : "E3-3"})`,
      `φP_n = φ·F_cr·A = ${factoredResistance.toFixed(1)} ${resistanceUnit}`,
      `P_u / φP_n = ${(input.factoredCompression.value / factoredResistance).toFixed(3)}`,
    ];
  }

  const demandCapacityRatio = input.factoredCompression.value / factoredResistance;
  const pass = warnings.length === 0 && demandCapacityRatio <= 1;

  return {
    runId: input.runId,
    moduleType: "column",
    engineVersion: "engine-0.1.0",
    sectionDbVersion: input.section.sectionDbVersion,
    codeProfile: input.codeProfile,
    unitSystem: input.unitSystem,
    demandMode: "user_factored_demands",
    displayInputSnapshot: {
      factoredCompression: input.factoredCompression,
      effectiveLength: input.effectiveLength,
      selectedSection: {
        label: "Selected section",
        value: input.section.designation,
        unit: "designation",
      },
    },
    normalizedInputs: {
      slenderness: Number(slenderness.toFixed(1)),
      elasticBucklingStress: Number(fe.toFixed(1)),
    },
    displayResults: {
      pass,
      slenderness: Number(slenderness.toFixed(1)),
      fe: Number(fe.toFixed(1)),
      fcr: fcrDisplay,
      factoredResistance: Number(factoredResistance.toFixed(1)),
      demandCapacityRatio: Number(demandCapacityRatio.toFixed(3)),
    },
    calculationLines,
    warnings,
    codeReferences: [codeClause],
  };
}
