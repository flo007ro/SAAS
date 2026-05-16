import type { CodeProfile } from "../domain/codeProfiles";
import { validateFactoredDemandInput } from "../domain/demandInputHandling";
import type { DesignResult } from "../domain/resultContract";
import type { SteelSection } from "../domain/sections/sectionTypes";
import type { UnitSystem, UnitValue } from "../domain/units";

export type BeamDesignInput = {
  runId: string;
  codeProfile: CodeProfile;
  unitSystem: UnitSystem;
  section: SteelSection;
  factoredMoment: UnitValue & { label: string };
  factoredShear: UnitValue & { label: string };
};

export function calculateBeamDesign(input: BeamDesignInput): DesignResult {
  const demandChecks = [
    validateFactoredDemandInput({ key: "factoredMoment", ...input.factoredMoment }),
    validateFactoredDemandInput({ key: "factoredShear", ...input.factoredShear }),
  ];
  const warnings = demandChecks.flatMap((check) => check.errors);

  const phi = 0.9;
  const fy = input.section.fy; // MPa (metric) or ksi (imperial) from section DB

  // Moment capacity in the display unit:
  //   metric:   φ × Fy (N/mm²) × Sx (mm³) / 1 000 000 → kN·m
  //   imperial: φ × Fy (ksi)   × Sx (in³) / 12          → kip·ft
  const phiMn =
    input.unitSystem === "metric"
      ? (phi * fy * input.section.sx) / 1_000_000
      : (phi * fy * input.section.sx) / 12;

  const momentRatio = input.factoredMoment.value / phiMn;
  const pass = warnings.length === 0 && momentRatio <= 1;

  const capacityUnit = input.unitSystem === "metric" ? "kN-m" : "kip-ft";
  const codeClause =
    input.codeProfile === "CSA_S16_19"
      ? "CSA S16-19 Clause 13.5"
      : "AISC 360-22 Section F2";

  return {
    runId: input.runId,
    moduleType: "beam",
    engineVersion: "engine-0.1.0",
    sectionDbVersion: input.section.sectionDbVersion,
    codeProfile: input.codeProfile,
    unitSystem: input.unitSystem,
    demandMode: "user_factored_demands",
    displayInputSnapshot: {
      factoredMoment: input.factoredMoment,
      factoredShear: input.factoredShear,
      selectedSection: {
        label: "Selected section",
        value: input.section.designation,
        unit: "designation",
      },
    },
    normalizedInputs: {
      // Normalised to SI (N·mm) regardless of unit system
      factoredMomentNmm:
        input.unitSystem === "metric"
          ? input.factoredMoment.value * 1_000_000
          : input.factoredMoment.value * 1_355_818, // kip·ft → N·mm (1 kip·ft = 1 355 818 N·mm)
      factoredShearN:
        input.unitSystem === "metric"
          ? input.factoredShear.value * 1_000
          : input.factoredShear.value * 4_448.22, // kip → N
    },
    displayResults: {
      pass,
      governingRatio: Number(momentRatio.toFixed(3)),
      designMomentCapacity: Number(phiMn.toFixed(1)),
    },
    calculationLines: [
      `${input.factoredMoment.label} = ${input.factoredMoment.value} ${input.factoredMoment.unit}`,
      `M_r = φ·Fy·Sx = ${phiMn.toFixed(1)} ${capacityUnit}  [φ = ${phi}, Fy = ${fy}, Sx = ${input.section.sx}]`,
      `Demand/capacity = ${momentRatio.toFixed(3)}`,
    ],
    warnings,
    codeReferences: [codeClause],
  };
}
