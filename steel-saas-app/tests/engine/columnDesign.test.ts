import { describe, expect, it } from "vitest";
import { calculateColumnDesign } from "../../src/engine/columnDesign";
import type { SteelSection } from "../../src/domain/sections/sectionTypes";

// ── shared section fixtures ──────────────────────────────────────────────────

const W310x60_CSA: SteelSection = {
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
  sourceNote: "test fixture",
};

const W310x39_CSA: SteelSection = {
  designation: "W310x39",
  standard: "CSA_S16_19",
  unitSystem: "metric",
  sectionDbVersion: "sections-0.1.0",
  family: "W",
  area: 4960,
  weightOrMass: 39,
  depth: 310,
  flangeWidth: 165,
  webThickness: 5.8,
  flangeThickness: 9.7,
  sx: 540000,
  ix: 83900000,
  rx: 130,
  ry: 38.3,
  fy: 345,
  sourceNote: "test fixture",
};

const W12x40_AISC: SteelSection = {
  designation: "W12x40",
  standard: "AISC_360_22",
  unitSystem: "imperial",
  sectionDbVersion: "sections-0.1.0",
  family: "W",
  area: 11.7,
  weightOrMass: 40,
  depth: 11.9,
  flangeWidth: 8,
  webThickness: 0.295,
  flangeThickness: 0.515,
  sx: 57.6,
  ix: 342,
  rx: 5.41,
  ry: 1.93,
  fy: 50,
  sourceNote: "test fixture",
};

// ── tests ────────────────────────────────────────────────────────────────────

describe("calculateColumnDesign", () => {
  it("stocky CSA column passes — KL/r ≈ 61, Cf = 1000 kN", () => {
    // KL/r = 3000/49 = 61.2 → λ_n ≈ 0.81 → Cr ≈ 1696 kN → ratio ≈ 0.59
    const result = calculateColumnDesign({
      runId: "run_col_1",
      codeProfile: "CSA_S16_19",
      unitSystem: "metric",
      section: W310x60_CSA,
      factoredCompression: { label: "Factored compression, C_f", value: 1000, unit: "kN" },
      effectiveLength: { label: "Effective length, KL", value: 3000, unit: "mm" },
    });

    expect(result.moduleType).toBe("column");
    expect(result.displayResults.pass).toBe(true);
    expect(result.displayResults.demandCapacityRatio as number).toBeLessThan(1);
    expect(result.displayResults.slenderness as number).toBeCloseTo(61.2, 0);
    expect(result.codeReferences[0]).toBe("CSA S16-19 Clause 13.3.1");
    expect(result.sectionDbVersion).toBe("sections-0.1.0");
  });

  it("slender CSA column fails — KL/r ≈ 209, Cf = 800 kN", () => {
    // KL/r = 8000/38.3 = 208.9 → very slender → Cr ≈ 192 kN → ratio ≈ 4.2
    const result = calculateColumnDesign({
      runId: "run_col_2",
      codeProfile: "CSA_S16_19",
      unitSystem: "metric",
      section: W310x39_CSA,
      factoredCompression: { label: "Factored compression, C_f", value: 800, unit: "kN" },
      effectiveLength: { label: "Effective length, KL", value: 8000, unit: "mm" },
    });

    expect(result.displayResults.pass).toBe(false);
    expect(result.displayResults.demandCapacityRatio as number).toBeGreaterThan(1);
    expect(result.displayResults.slenderness as number).toBeCloseTo(208.9, 0);
    expect(result.codeReferences[0]).toBe("CSA S16-19 Clause 13.3.1");
  });

  it("AISC 360-22 column passes — KL/r ≈ 62.2, Pu = 200 kips", () => {
    // KL/r = 120/1.93 = 62.2 → inelastic (E3-2) → Fcr ≈ 37.7 ksi → φPn ≈ 396 kips → ratio ≈ 0.50
    const result = calculateColumnDesign({
      runId: "run_col_3",
      codeProfile: "AISC_360_22",
      unitSystem: "imperial",
      section: W12x40_AISC,
      factoredCompression: { label: "Factored compression, P_u", value: 200, unit: "kip" },
      effectiveLength: { label: "Effective length, KL", value: 120, unit: "in" },
    });

    expect(result.displayResults.pass).toBe(true);
    expect(result.displayResults.demandCapacityRatio as number).toBeLessThan(1);
    expect(result.displayResults.slenderness as number).toBeCloseTo(62.2, 0);
    expect(result.codeReferences[0]).toBe("AISC 360-22 Section E3");
    expect(result.normalizedInputs.elasticBucklingStress as number).toBeCloseTo(74.0, 0);
  });

  it("CSA and AISC produce different capacities via different buckling curves", () => {
    // KL = 5000 mm, ry = 49 mm → KL/r = 102 → Fe ≈ 190 MPa
    // CSA Cr ≈ 988 kN  (λ_n = 1.35, more conservative tanh-like curve)
    // AISC φPn ≈ 1106 kN (0.658^1.82 × Fy formula, less conservative here)
    // At Cf = 1100 kN: CSA fails (1.11 > 1), AISC passes (0.99 < 1)
    const shared = {
      runId: "run_col_compare",
      unitSystem: "metric" as const,
      section: W310x60_CSA,
      factoredCompression: { label: "Factored compression, C_f", value: 1100, unit: "kN" as const },
      effectiveLength: { label: "Effective length, KL", value: 5000, unit: "mm" as const },
    };

    const csaResult = calculateColumnDesign({ ...shared, codeProfile: "CSA_S16_19" });
    const aiscResult = calculateColumnDesign({ ...shared, codeProfile: "AISC_360_22" });

    // Different formulas → different factored resistances
    expect(csaResult.displayResults.factoredResistance as number).toBeLessThan(
      aiscResult.displayResults.factoredResistance as number,
    );

    // CSA fails where AISC passes at this load level
    expect(csaResult.displayResults.pass).toBe(false);
    expect(aiscResult.displayResults.pass).toBe(true);

    // Correct code clause references
    expect(csaResult.codeReferences[0]).toBe("CSA S16-19 Clause 13.3.1");
    expect(aiscResult.codeReferences[0]).toBe("AISC 360-22 Section E3");
  });

  it("label missing 'Factored' adds a warning and forces pass=false", () => {
    const result = calculateColumnDesign({
      runId: "run_col_warn",
      codeProfile: "CSA_S16_19",
      unitSystem: "metric",
      section: W310x60_CSA,
      factoredCompression: { label: "Compression load", value: 500, unit: "kN" },
      effectiveLength: { label: "Effective length, KL", value: 3000, unit: "mm" },
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.displayResults.pass).toBe(false);
  });

  it("result carries the self-contained result_json contract fields", () => {
    const result = calculateColumnDesign({
      runId: "run_col_contract",
      codeProfile: "CSA_S16_19",
      unitSystem: "metric",
      section: W310x60_CSA,
      factoredCompression: { label: "Factored compression, C_f", value: 500, unit: "kN" },
      effectiveLength: { label: "Effective length, KL", value: 3000, unit: "mm" },
    });

    expect(result.runId).toBe("run_col_contract");
    expect(result.engineVersion).toBe("engine-0.1.0");
    expect(result.demandMode).toBe("user_factored_demands");
    expect(result.displayInputSnapshot.factoredCompression.label).toContain("Factored");
    expect(result.displayInputSnapshot.selectedSection.value).toBe("W310x60");
    expect(result.calculationLines.length).toBeGreaterThan(0);
  });
});
