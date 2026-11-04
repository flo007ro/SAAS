import type { DesignResult } from "../domain/resultContract";
import { demandLabel, implementedChecksVerdict, resultWarnings } from "../domain/resultPresentation";

export type ReportModel = {
  title: string;
  inputRows: Array<{ label: string; value: string }>;
  resultRows: Array<{ label: string; value: string }>;
  calculationLines: string[];
  warnings: string[];
  codeReferences: string[];
  signatureBlock: {
    title: string;
    fields: string[];
  };
};

export function buildReportModelFromResultJson(result: DesignResult): ReportModel {
  return {
    title: result.moduleType === "brace" ? "Brace preliminary member checks — engineering review required" : `${result.moduleType} design calculation`,
    inputRows: Object.entries(result.displayInputSnapshot).map(([key, entry]) => ({
      label: demandLabel(key, result.codeProfile, entry.label),
      value: `${entry.value} ${entry.unit}`,
    })),
    resultRows: Object.entries(result.displayResults).map(([label, value]) => ({
      label: label === "pass" ? "Implemented checks" : label,
      value: label === "pass" ? (result.moduleType === "brace" ? "Engineering review required" : implementedChecksVerdict(value)) : String(value),
    })),
    calculationLines: result.calculationLines,
    warnings: resultWarnings(result.moduleType, result.warnings),
    codeReferences: result.codeReferences,
    signatureBlock: {
      title: "Engineer of Record",
      fields: ["Printed name", "License number", "Signature", "Date"],
    },
  };
}
