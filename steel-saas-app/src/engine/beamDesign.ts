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

  // ── Moment capacity ───────────────────────────────────────────────────────
  // AISC 360-22 Section F2 / CSA S16-19 Clause 13.5 (compact section, no LTB)
  //   metric:   φ × Fy (N/mm²) × Sx (mm³) / 1 000 000 → kN·m
  //   imperial: φ × Fy (ksi)   × Sx (in³) / 12          → kip·ft
  const phiMn =
    input.unitSystem === "metric"
      ? (phi * fy * input.section.sx) / 1_000_000
      : (phi * fy * input.section.sx) / 12;

  const momentDCR = input.factoredMoment.value / phiMn;

  // ── Shear capacity ────────────────────────────────────────────────────────
  // Clear web shear area: Aw = (d − 2·tf) × tw
  // AISC 360-22 Section G2.1: φv = 1.0, Vn = 0.6·Fy·Aw·Cv1, Cv1 = 1.0
  //   (h/tw ≤ 2.24√(E/Fy) for most W-shapes → Cv1 = 1.0 governs)
  // CSA S16-19 Clause 13.4: φv = 0.9, Vr = 0.9 × 0.66·Fy·Aw
  const aw = (input.section.depth - 2 * input.section.flangeThickness) * input.section.webThickness;
  const phiV = input.codeProfile === "CSA_S16_19" ? 0.9 : 1.0;
  const shearCoeff = input.codeProfile === "CSA_S16_19" ? 0.66 : 0.60;

  // phiVn in base force units (N metric, kip imperial) → convert to display unit
  const phiVnBase = phiV * shearCoeff * fy * aw;
  const phiVnDisplay =
    input.unitSystem === "metric" ? phiVnBase / 1_000 : phiVnBase; // N→kN or kip stays

  const shearDCR = input.factoredShear.value / phiVnDisplay;

  const pass = warnings.length === 0 && momentDCR <= 1 && shearDCR <= 1;

  const momentCapUnit = input.unitSystem === "metric" ? "kN-m" : "kip-ft";
  const shearCapUnit: string = input.unitSystem === "metric" ? "kN" : "kip";
  const areaUnit = input.unitSystem === "metric" ? "mm²" : "in²";
  const stressUnit = input.unitSystem === "metric" ? "MPa" : "ksi";

  const codeClause =
    input.codeProfile === "CSA_S16_19"
      ? "CSA S16-19 Cls. 13.5 + 13.4"
      : "AISC 360-22 Secs. F2 + G2.1";

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
      // Normalised to SI regardless of unit system
      factoredMomentNmm:
        input.unitSystem === "metric"
          ? input.factoredMoment.value * 1_000_000
          : input.factoredMoment.value * 1_355_818, // kip·ft → N·mm
      factoredShearN:
        input.unitSystem === "metric"
          ? input.factoredShear.value * 1_000
          : input.factoredShear.value * 4_448.22, // kip → N
    },
    displayResults: {
      pass,
      momentDCR: Number(momentDCR.toFixed(3)),
      shearDCR: Number(shearDCR.toFixed(3)),
      designMomentCapacity: Number(phiMn.toFixed(1)),
      designShearCapacity: Number(phiVnDisplay.toFixed(1)),
    },
    calculationLines: [
      // Moment
      `${input.factoredMoment.label} = ${input.factoredMoment.value} ${input.factoredMoment.unit}`,
      `M_r = φ·Fy·Sx = ${phiMn.toFixed(1)} ${momentCapUnit}  [φ=${phi}, Fy=${fy} ${stressUnit}, Sx=${input.section.sx}]`,
      `Moment DCR = ${momentDCR.toFixed(3)}`,
      // Shear
      `${input.factoredShear.label} = ${input.factoredShear.value} ${input.factoredShear.unit}`,
      `A_w = (d−2t_f)·t_w = ${aw.toFixed(input.unitSystem === "metric" ? 0 : 3)} ${areaUnit}`,
      `V_r = φv·${shearCoeff}·Fy·A_w = ${phiVnDisplay.toFixed(1)} ${shearCapUnit}  [φv=${phiV}]`,
      `Shear DCR = ${shearDCR.toFixed(3)}`,
    ],
    warnings,
    codeReferences: [codeClause],
    sectionSnapshot: {
      designation: input.section.designation,
      A:  input.section.area,
      d:  input.section.depth,
      bf: input.section.flangeWidth,
      tf: input.section.flangeThickness,
      tw: input.section.webThickness,
      Sx: input.section.sx,
      ry: input.section.ry,
      Fy: input.section.fy,
      sectionDbVersion: input.section.sectionDbVersion,
    },
  };
}
