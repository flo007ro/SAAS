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
  const fyMpa = 345;
  const nominalMomentKnM = (phi * fyMpa * input.section.sx) / 1_000_000;
  const momentRatio = input.factoredMoment.value / nominalMomentKnM;
  const pass = warnings.length === 0 && momentRatio <= 1;

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
      factoredMomentNmm: input.factoredMoment.value * 1_000_000,
      factoredShearN: input.factoredShear.value * 1_000,
    },
    displayResults: {
      pass,
      governingRatio: Number(momentRatio.toFixed(3)),
      designMomentCapacity: Number(nominalMomentKnM.toFixed(1)),
    },
    calculationLines: [
      `${input.factoredMoment.label} = ${input.factoredMoment.value} ${input.factoredMoment.unit}`,
      `M_r = phi Fy Sx = ${nominalMomentKnM.toFixed(1)} kN-m`,
      `Demand/capacity = ${momentRatio.toFixed(3)}`,
    ],
    warnings,
    codeReferences: [input.codeProfile === "CSA_S16_19" ? "CSA S16-19" : "AISC 360-22"],
  };
}
