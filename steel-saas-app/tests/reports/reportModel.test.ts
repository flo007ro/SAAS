import { describe, expect, it } from "vitest";
import { buildReportModelFromResultJson } from "../../src/reports/reportModel";

describe("buildReportModelFromResultJson", () => {
  it("builds a report model without input_json", () => {
    const report = buildReportModelFromResultJson({
      runId: "run_1",
      moduleType: "beam",
      engineVersion: "engine-0.1.0",
      sectionDbVersion: "sections-0.1.0",
      codeProfile: "CSA_S16_19",
      unitSystem: "metric",
      demandMode: "user_factored_demands",
      displayInputSnapshot: {
        factoredMoment: { label: "Factored moment, M_f", value: 125, unit: "kN-m" },
      },
      normalizedInputs: { factoredMomentNmm: 125000000 },
      displayResults: { pass: true, governingRatio: 0.72 },
      calculationLines: ["M_f = 125 kN-m"],
      warnings: [],
      codeReferences: ["CSA S16-19"],
    });

    expect(report.inputRows[0].label).toBe("Factored moment, M_f");
    expect(report.signatureBlock.fields).toEqual(["Printed name", "License number", "Signature", "Date"]);
  });
});
