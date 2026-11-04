import type { DesignResult } from "./resultContract";

export const RESULT_SCOPE: Partial<Record<DesignResult["moduleType"], string>> = {
  beam: "Scope: elastic major-axis flexure and simplified shear only; section classification, lateral-torsional buckling and deflection are not checked.",
  column: "Scope: weak-axis flexural buckling under axial compression only; local/torsional buckling and combined bending are not checked.",
  base_plate: "Scope: concentric compression bearing and required thickness only; supplied thickness, anchors, welds, uplift and moment are not checked.",
};

export function resultWarnings(moduleType: DesignResult["moduleType"], warnings: string[]): string[] {
  const scope = RESULT_SCOPE[moduleType];
  return scope && !warnings.includes(scope) ? [...warnings, scope] : [...warnings];
}

export function demandLabel(key: string, codeProfile: string, fallback = key): string {
  const aisc = codeProfile === "AISC_360_22";
  switch (key) {
    case "factoredMoment": return `Factored moment, ${aisc ? "M_u" : "M_f"}`;
    case "factoredShear": return `Factored shear, ${aisc ? "V_u" : "V_f"}`;
    case "factoredCompression": return `Factored compression, ${aisc ? "P_u" : "C_f"}`;
    default: return fallback;
  }
}

export function implementedChecksVerdict(pass: unknown): string {
  return pass === true ? "Implemented checks pass" : "Implemented checks fail";
}
