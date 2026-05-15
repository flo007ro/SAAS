import { describe, expect, it } from "vitest";
import { calculateBasePlateDesign } from "../../src/engine/basePlateDesign";
import type { BasePlateDesignInput } from "../../src/engine/basePlateDesign";
import type { SteelSection } from "../../src/domain/sections/sectionTypes";

// ── shared section fixture ───────────────────────────────────────────────────

const W310x60: SteelSection = {
  designation: "W310x60",
  standard: "CSA_S16_19",
  unitSystem: "metric",
  sectionDbVersion: "sections-0.1.0",
  family: "W",
  area: 7640,
  weightOrMass: 60,
  depth: 310,       // d
  flangeWidth: 205, // bf
  webThickness: 9.4,
  flangeThickness: 12.7,
  sx: 875000,
  ix: 136000000,
  rx: 133,
  ry: 49.0,
  fy: 345,
  sourceNote: "test fixture",
};

// Build a full input with easy overrides
function makeInput(overrides: Partial<BasePlateDesignInput> = {}): BasePlateDesignInput {
  return {
    runId: "run_bp_1",
    codeProfile: "CSA_S16_19",
    unitSystem: "metric",
    section: W310x60,
    factoredCompression: { label: "Factored compression, C_f", value: 1500, unit: "kN" },
    plateN: { label: "Plate dimension N", value: 450, unit: "mm" },
    plateB: { label: "Plate dimension B", value: 400, unit: "mm" },
    concreteStrength: { label: "Concrete strength, f'c", value: 28, unit: "MPa" },
    plateFy: { label: "Plate yield strength, F_y", value: 250, unit: "MPa" },
    ...overrides,
  };
}

// ── tests ────────────────────────────────────────────────────────────────────

describe("calculateBasePlateDesign", () => {
  it("bearing area passes and n-cantilever governs the required plate thickness", () => {
    // A1_req  = 1 500 000 / (0.60 × 0.85 × 28) = 105 042 mm²
    // A1_supp = 450 × 400 = 180 000 mm²  → bearing passes
    // m = (450 − 0.95×310)/2 = 77.75 mm
    // n = (400 − 0.80×205)/2 = 118.00 mm  → n governs
    // fp  = 1 500 000 / 180 000 = 8.333 MPa
    // tp  = 118 × √(2×8.333 / (0.90×250)) = 118 × 0.2722 ≈ 32.12 mm
    const result = calculateBasePlateDesign(makeInput());

    expect(result.moduleType).toBe("base_plate");
    expect(result.displayResults.bearingAreaPass).toBe(true);
    expect(result.displayResults.pass).toBe(true);
    expect(result.displayResults.governingCantilever).toBe("n");
    expect(result.displayResults.n as number).toBeCloseTo(118.0, 1);
    expect(result.displayResults.m as number).toBeCloseTo(77.75, 1);
    expect(result.displayResults.tpRequired as number).toBeCloseTo(32.1, 0);
    expect(result.codeReferences[0]).toBe("CSA S16-19 Clause 17.5");
    expect(result.sectionDbVersion).toBe("sections-0.1.0");
  });

  it("bearing area fails when the plate is too small for the applied load", () => {
    // A1_req  = 2 000 000 / (0.60 × 0.85 × 20) = 196 078 mm²
    // A1_supp = 200 × 200 = 40 000 mm²  → bearing fails
    const result = calculateBasePlateDesign(
      makeInput({
        factoredCompression: { label: "Factored compression, C_f", value: 2000, unit: "kN" },
        plateN: { label: "Plate dimension N", value: 200, unit: "mm" },
        plateB: { label: "Plate dimension B", value: 200, unit: "mm" },
        concreteStrength: { label: "Concrete strength, f'c", value: 20, unit: "MPa" },
      }),
    );

    expect(result.displayResults.bearingAreaPass).toBe(false);
    expect(result.displayResults.pass).toBe(false);
    expect(result.displayResults.bearingDCR as number).toBeGreaterThan(1);
    // Required area is far larger than supplied
    expect(result.displayResults.a1Required as number).toBeGreaterThan(
      result.displayResults.a1Supplied as number,
    );
  });

  it("AISC φc=0.65 requires a smaller bearing area than CSA φc=0.60 for identical inputs", () => {
    // With N=320, B=320 (A₁=102 400 mm²), Pu=1500 kN, f'c=28 MPa:
    //   AISC A1_req = 1 500 000 / (0.65 × 0.85 × 28) = 96 958 mm²  → 102 400 ≥ 96 958 → PASS
    //   CSA  A1_req = 1 500 000 / (0.60 × 0.85 × 28) = 105 042 mm² → 102 400 <  105 042 → FAIL
    const shared = {
      factoredCompression: { label: "Factored compression, P_u", value: 1500, unit: "kN" as const },
      plateN: { label: "Plate dimension N", value: 320, unit: "mm" as const },
      plateB: { label: "Plate dimension B", value: 320, unit: "mm" as const },
      concreteStrength: { label: "Concrete strength, f'c", value: 28, unit: "MPa" as const },
    };

    const csaResult = calculateBasePlateDesign(makeInput({ ...shared, codeProfile: "CSA_S16_19" }));
    const aiscResult = calculateBasePlateDesign(makeInput({ ...shared, codeProfile: "AISC_360_22" }));

    // CSA demands larger bearing area
    expect(csaResult.displayResults.a1Required as number).toBeGreaterThan(
      aiscResult.displayResults.a1Required as number,
    );

    // Split result: AISC passes, CSA fails
    expect(aiscResult.displayResults.bearingAreaPass).toBe(true);
    expect(csaResult.displayResults.bearingAreaPass).toBe(false);

    // Correct code references
    expect(csaResult.codeReferences[0]).toBe("CSA S16-19 Clause 17.5");
    expect(aiscResult.codeReferences[0]).toBe("AISC 360-22 Section J8");
  });

  it("m-cantilever governs when N is large relative to d", () => {
    // N=600, B=350, W310x60 (d=310, bf=205):
    //   m = (600 − 0.95×310) / 2 = 152.75 mm
    //   n = (350 − 0.80×205) / 2 =  93.00 mm  → m governs
    const result = calculateBasePlateDesign(
      makeInput({
        plateN: { label: "Plate dimension N", value: 600, unit: "mm" },
        plateB: { label: "Plate dimension B", value: 350, unit: "mm" },
      }),
    );

    expect(result.displayResults.governingCantilever).toBe("m");
    expect(result.displayResults.m as number).toBeCloseTo(152.75, 1);
    expect(result.displayResults.n as number).toBeCloseTo(93.0, 1);
    expect(result.displayResults.lGoverning as number).toBeCloseTo(152.75, 1);
  });

  it("n-cantilever governs when B is large relative to bf", () => {
    // Already verified in test 1: N=450, B=400 → n=118 > m=77.75
    const result = calculateBasePlateDesign(makeInput());

    expect(result.displayResults.governingCantilever).toBe("n");
    expect(result.displayResults.lGoverning as number).toBeCloseTo(118.0, 1);
  });

  it("result carries the self-contained result_json contract fields", () => {
    const result = calculateBasePlateDesign(makeInput());

    expect(result.runId).toBe("run_bp_1");
    expect(result.engineVersion).toBe("engine-0.1.0");
    expect(result.demandMode).toBe("user_factored_demands");
    expect(result.displayInputSnapshot.factoredCompression.label).toContain("Factored");
    expect(result.displayInputSnapshot.columnSection.value).toBe("W310x60");
    expect(result.calculationLines.length).toBeGreaterThan(0);
  });

  it("missing 'Factored' in label adds a warning and forces pass=false", () => {
    const result = calculateBasePlateDesign(
      makeInput({
        factoredCompression: { label: "Compression load", value: 1500, unit: "kN" },
      }),
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.displayResults.pass).toBe(false);
  });
});
