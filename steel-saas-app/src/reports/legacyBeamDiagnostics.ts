import type { DesignResult } from "../domain/resultContract";

export const LEGACY_DIAGNOSTICS_TITLE = "Legacy diagnostics \u2014 unverified";
export const LEGACY_DIAGNOSTICS_NOTE = "Uses original catalog Fy, not the assessment material Fy. These unverified diagnostics do not establish full flexure or shear adequacy and do not change the modern check verdict.";

export const LEGACY_DIAGNOSTIC_KEYS = [
  "legacyElasticMomentCapacity", "legacySimplifiedShearCapacity",
  "legacyElasticMomentDCR", "legacySimplifiedShearDCR",
] as const;

export function legacyBeamDiagnosticRows(result: Pick<DesignResult, "moduleType" | "beamChecks" | "displayResults" | "displayInputSnapshot">) {
  if (result.moduleType !== "beam" || result.beamChecks === undefined) return [];
  const definitions = [
    [LEGACY_DIAGNOSTIC_KEYS[0], "Legacy elastic moment capacity (unverified)", result.displayInputSnapshot.factoredMoment?.unit ?? "unit unavailable"],
    [LEGACY_DIAGNOSTIC_KEYS[1], "Legacy simplified shear capacity (unverified)", result.displayInputSnapshot.factoredShear?.unit ?? "unit unavailable"],
    [LEGACY_DIAGNOSTIC_KEYS[2], "Legacy elastic moment diagnostic DCR", ""],
    [LEGACY_DIAGNOSTIC_KEYS[3], "Legacy simplified shear diagnostic DCR", ""],
  ];
  return definitions.flatMap(([key, label, unit]) => {
    const value = result.displayResults[key];
    return typeof value === "number" && Number.isFinite(value)
      ? [{ label, value: `${value}${unit ? ` ${unit}` : ""}` }] : [];
  });
}
