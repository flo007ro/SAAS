import type { CodeProfile } from "../domain/codeProfiles";
import { validateFactoredDemandInput } from "../domain/demandInputHandling";
import type { DesignResult } from "../domain/resultContract";
import type { SteelSection } from "../domain/sections/sectionTypes";
import type { EngineeringUnit, UnitSystem, UnitValue } from "../domain/units";

export type BasePlateDesignInput = {
  runId: string;
  codeProfile: CodeProfile;
  unitSystem: UnitSystem;
  section: SteelSection;
  factoredCompression: UnitValue & { label: string };
  plateN: UnitValue & { label: string };
  plateB: UnitValue & { label: string };
  concreteStrength: UnitValue & { label: string };
  plateFy: UnitValue & { label: string };
};

// ── resistance factors ────────────────────────────────────────────────────────

function phiFactors(codeProfile: CodeProfile): { phiC: number; phiB: number } {
  return {
    phiC: codeProfile === "AISC_360_22" ? 0.65 : 0.60, // bearing on concrete
    phiB: 0.90,                                          // plate flexure (same for both)
  };
}

// ── main function ─────────────────────────────────────────────────────────────

export function calculateBasePlateDesign(input: BasePlateDesignInput): DesignResult {
  const demandChecks = [
    validateFactoredDemandInput({ key: "factoredCompression", ...input.factoredCompression }),
  ];
  const warnings = demandChecks.flatMap((c) => c.errors);

  const { phiC, phiB } = phiFactors(input.codeProfile);

  const N = input.plateN.value;
  const B = input.plateB.value;
  const d = input.section.depth;
  const bf = input.section.flangeWidth;
  const fc = input.concreteStrength.value;
  const fyPlate = input.plateFy.value;

  // Applied load — normalise to consistent pressure units
  // metric: kN → N (so N/(N/mm²) = mm²); imperial: kips (kips/(kips/in²) = in²)
  const puNorm =
    input.unitSystem === "metric"
      ? input.factoredCompression.value * 1_000
      : input.factoredCompression.value;

  // ── 1. Bearing area ──────────────────────────────────────────────────────
  const a1Req = puNorm / (phiC * 0.85 * fc);
  const a1Supplied = N * B;
  const bearingAreaPass = a1Supplied >= a1Req;
  const bearingDCR = a1Req / a1Supplied; // >1 = fail

  // ── 2. Cantilever dimensions ─────────────────────────────────────────────
  const m = (N - 0.95 * d) / 2;
  const n = (B - 0.80 * bf) / 2;
  const lGov = Math.max(m, n, 0);
  const governingCantilever: "m" | "n" = m >= n ? "m" : "n";

  // ── 3. Required plate thickness ──────────────────────────────────────────
  // fp = bearing pressure; tp = l × sqrt(2fp / (φb × Fy))
  const fp = puNorm / a1Supplied;
  const tpReq = lGov * Math.sqrt((2 * fp) / (phiB * fyPlate));

  const pass = warnings.length === 0 && bearingAreaPass;

  const lengthUnit: EngineeringUnit = input.unitSystem === "metric" ? "mm" : "in";
  const pressureUnit = input.unitSystem === "metric" ? "MPa" : "ksi";
  const forceUnit: EngineeringUnit = input.unitSystem === "metric" ? "kN" : "kip";
  const codeClause =
    input.codeProfile === "CSA_S16_19" ? "CSA S16-19 Clause 17.5" : "AISC 360-22 Section J8";

  return {
    runId: input.runId,
    moduleType: "base_plate",
    engineVersion: "engine-0.1.0",
    sectionDbVersion: input.section.sectionDbVersion,
    codeProfile: input.codeProfile,
    unitSystem: input.unitSystem,
    demandMode: "user_factored_demands",
    displayInputSnapshot: {
      factoredCompression: input.factoredCompression,
      plateN: input.plateN,
      plateB: input.plateB,
      concreteStrength: input.concreteStrength,
      plateFy: input.plateFy,
      columnSection: {
        label: "Column section",
        value: input.section.designation,
        unit: "designation",
      },
    },
    normalizedInputs: {
      a1Required: Number(a1Req.toFixed(0)),
      a1Supplied: Number(a1Supplied.toFixed(0)),
      bearingPressure: Number(fp.toFixed(3)),
      m: Number(m.toFixed(2)),
      n: Number(n.toFixed(2)),
    },
    displayResults: {
      pass,
      bearingAreaPass,
      a1Required: Number(a1Req.toFixed(0)),
      a1Supplied,
      bearingDCR: Number(bearingDCR.toFixed(3)),
      m: Number(m.toFixed(2)),
      n: Number(n.toFixed(2)),
      governingCantilever,
      lGoverning: Number(lGov.toFixed(2)),
      bearingPressure: Number(fp.toFixed(3)),
      tpRequired: Number(tpReq.toFixed(2)),
    },
    calculationLines: [
      `${input.factoredCompression.label} = ${input.factoredCompression.value} ${forceUnit}`,
      `Plate: N = ${N} ${lengthUnit}, B = ${B} ${lengthUnit}`,
      `A₁_req = P / (φc × 0.85 × f'c) = ${a1Req.toFixed(0)} ${lengthUnit}² [φc = ${phiC}]`,
      `A₁_supplied = N × B = ${a1Supplied} ${lengthUnit}² → ${bearingAreaPass ? "PASS" : "FAIL"}`,
      `m = (N − 0.95d) / 2 = ${m.toFixed(2)} ${lengthUnit}`,
      `n = (B − 0.80b_f) / 2 = ${n.toFixed(2)} ${lengthUnit}`,
      `ℓ = max(m, n) = ${lGov.toFixed(2)} ${lengthUnit} (${governingCantilever} governs)`,
      `f_p = P / (N × B) = ${fp.toFixed(3)} ${pressureUnit}`,
      `t_p,req = ℓ × √(2f_p / (φb × F_y)) = ${tpReq.toFixed(2)} ${lengthUnit} [φb = ${phiB}]`,
    ],
    warnings,
    codeReferences: [codeClause],
  };
}
