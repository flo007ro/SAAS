import type { DesignResult } from "../domain/resultContract";

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
    title: `${result.moduleType} design calculation`,
    inputRows: Object.values(result.displayInputSnapshot).map((entry) => ({
      label: entry.label,
      value: `${entry.value} ${entry.unit}`,
    })),
    resultRows: Object.entries(result.displayResults).map(([label, value]) => ({
      label,
      value: String(value),
    })),
    calculationLines: result.calculationLines,
    warnings: result.warnings,
    codeReferences: result.codeReferences,
    signatureBlock: {
      title: "Engineer of Record",
      fields: ["Printed name", "License number", "Signature", "Date"],
    },
  };
}
