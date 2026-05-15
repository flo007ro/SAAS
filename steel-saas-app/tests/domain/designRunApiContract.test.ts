import { describe, expect, it } from "vitest";
import { createSynchronousDesignRunResponse } from "../../src/domain/designRunResponse";

describe("createSynchronousDesignRunResponse", () => {
  it("returns complete status and self-contained result json", () => {
    const response = createSynchronousDesignRunResponse({
      id: "run_1",
      status: "complete",
      resultJson: {
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
        displayResults: { pass: true },
        calculationLines: ["M_f = 125 kN-m"],
        warnings: [],
        codeReferences: ["CSA S16-19"],
      },
    });

    expect(response.status).toBe("complete");
    expect(response.resultJson.displayInputSnapshot.factoredMoment.label).toContain("Factored");
  });
});
