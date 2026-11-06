import type { DesignResult } from "../domain/resultContract";
import { beamCheckRows, beamChecksVerdict, beamSectionPropertyRows, beamServiceabilityRows, demandLabel, implementedChecksVerdict, resultWarnings } from "../domain/resultPresentation";
import { legacyBeamDiagnosticRows, LEGACY_DIAGNOSTIC_KEYS } from "./legacyBeamDiagnostics";

export type ReportModel = {
  title: string;
  inputRows: Array<{ label: string; value: string }>;
  resultRows: Array<{ label: string; value: string }>;
  calculationLines: string[];
  warnings: string[];
  codeReferences: string[];
  beamCheckRows?: ReturnType<typeof beamCheckRows>;
  sectionPropertyRows?: ReturnType<typeof beamSectionPropertyRows>;
  serviceabilityRows?: ReturnType<typeof beamServiceabilityRows>;
  legacyDiagnosticRows?: ReturnType<typeof legacyBeamDiagnosticRows>;
  signatureBlock: {
    title: string;
    fields: string[];
  };
};

export function buildReportModelFromResultJson(result: DesignResult): ReportModel {
  const checks = result.moduleType === "beam" ? result.beamChecks : undefined;
  return {
    title: result.moduleType === "brace" ? "Brace preliminary member checks — engineering review required" : `${result.moduleType} design calculation`,
    inputRows: Object.entries(result.displayInputSnapshot).map(([key, entry]) => ({
      label: demandLabel(key, result.codeProfile, entry.label),
      value: `${entry.value} ${entry.unit}`,
    })),
    resultRows: Object.entries(result.displayResults).filter(([key]) => !(checks && LEGACY_DIAGNOSTIC_KEYS.some(diagnosticKey => diagnosticKey === key))).map(([label, value]) => ({
      label: label === "pass" ? "Implemented checks" : label,
      value: label === "pass" ? (checks ? beamChecksVerdict(checks) : result.moduleType === "brace" ? "Engineering review required" : implementedChecksVerdict(value)) : String(value),
    })),
    calculationLines: result.calculationLines,
    warnings: resultWarnings(result.moduleType, result.warnings, checks),
    ...(checks ? { beamCheckRows: beamCheckRows(checks) } : {}),
    ...(checks ? { serviceabilityRows: beamServiceabilityRows(result) } : {}),
    ...(checks ? { legacyDiagnosticRows: legacyBeamDiagnosticRows(result) } : {}),
    ...(checks && result.sectionSnapshot ? { sectionPropertyRows: beamSectionPropertyRows(result.sectionSnapshot, result.unitSystem) } : {}),
    codeReferences: result.codeReferences,
    signatureBlock: {
      title: "Engineer of Record",
      fields: ["Printed name", "License number", "Signature", "Date"],
    },
  };
}
