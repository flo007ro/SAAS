import { describe, expect, it } from "vitest";
import { calculateBeamDesign } from "../../src/engine/beamDesign";

describe("calculateBeamDesign", () => {
  it("returns a self-contained passing result for a simple beam", () => {
    const result = calculateBeamDesign({
      runId: "run_beam_1",
      codeProfile: "CSA_S16_19",
      unitSystem: "metric",
      section: {
        designation: "W310x60",
        standard: "CSA_S16_19",
        unitSystem: "metric",
        sectionDbVersion: "sections-0.1.0",
        family: "W",
        area: 7640,
        weightOrMass: 60,
        depth: 310,
        flangeWidth: 205,
        webThickness: 9.4,
        flangeThickness: 12.7,
        sx: 875000,
        ix: 136000000,
        rx: 133,
        ry: 49.0,
        fy: 345,
        sourceNote: "test section",
      },
      factoredMoment: { label: "Factored moment, M_f", value: 125, unit: "kN-m" },
      factoredShear: { label: "Factored shear, V_f", value: 80, unit: "kN" },
    });

    expect(result.moduleType).toBe("beam");
    expect(result.displayInputSnapshot.factoredMoment.label).toBe("Factored moment, M_f");
    expect(result.displayResults.pass).toBe(true);
    expect(result.sectionDbVersion).toBe("sections-0.1.0");
  });
});
