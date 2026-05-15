import { describe, expect, it } from "vitest";
import { designResultSchema } from "../../src/domain/resultContract";

describe("designResultSchema", () => {
  it("requires display inputs inside result_json", () => {
    const parsed = designResultSchema.parse({
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
      normalizedInputs: {
        factoredMomentNmm: 125000000,
      },
      displayResults: {
        pass: true,
        governingRatio: 0.72,
      },
      calculationLines: ["M_f = 125 kN-m"],
      warnings: [],
      codeReferences: ["CSA S16-19"],
    });

    expect(parsed.displayInputSnapshot.factoredMoment.label).toBe("Factored moment, M_f");
  });
});
