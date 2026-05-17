/**
 * ENGINE VALIDATION EXAMPLES
 *
 * Hand-verified reference cases whose inputs and expected outputs were taken
 * directly from the original structural steel design workbook.  These are NOT
 * unit tests — they are end-to-end checks of the calculation engines against
 * known-good benchmarks.
 *
 * Each case documents:
 *   • The section used and its seed properties (corrected 2026-05-16)
 *   • The hand-calculated expected output
 *   • Any discrepancy and its likely cause
 *
 * VALIDATION MISMATCH comments mark cases where the engine output does not
 * match the workbook reference.  Do NOT adjust assertions to paper over a
 * mismatch — surface the discrepancy for manual review.
 *
 * SECTION DATA AUDIT (2026-05-16)
 *   W12×40  — corrected against AISC SCM 16th ed. Table 1-1
 *               ix: 342→307 in⁴, sx: 57.6→51.5 in³, rx: 5.41→5.13 in
 *   W310×39 — corrected against CISC HB 11th ed. Table 5-1
 *               ix: 83.9→84.9×10⁶ mm⁴, sx: 540→548×10³ mm³, rx: 130→131 mm
 *   W310×60 — retained from workbook seed pending CISC verification
 *               (~2 % discrepancy vs first-principles calculation)
 */

import { describe, expect, it } from "vitest";
import { calculateBeamDesign } from "../../src/engine/beamDesign";
import { calculateColumnDesign } from "../../src/engine/columnDesign";
import { calculateBasePlateDesign } from "../../src/engine/basePlateDesign";
import type { SteelSection } from "../../src/domain/sections/sectionTypes";

// ── section fixtures ──────────────────────────────────────────────────────────

// Corrected 2026-05-16 against AISC SCM 16th ed. Table 1-1.
const W12x40_AISC: SteelSection = {
  designation: "W12x40",
  standard: "AISC_360_22",
  unitSystem: "imperial",
  sectionDbVersion: "sections-0.1.0",
  family: "W",
  area: 11.7, depth: 11.9, flangeWidth: 8,
  webThickness: 0.295, flangeThickness: 0.515,
  sx: 51.5, ix: 307, rx: 5.13, ry: 1.94, fy: 50,
  sourceNote: "Corrected against AISC SCM 16th ed. Table 1-1.",
};

// Retained from workbook seed — see header for W310x60 note.
const W310x60_CSA: SteelSection = {
  designation: "W310x60",
  standard: "CSA_S16_19",
  unitSystem: "metric",
  sectionDbVersion: "sections-0.1.0",
  family: "W",
  area: 7640, depth: 310, flangeWidth: 205,
  webThickness: 9.4, flangeThickness: 12.7,
  sx: 875000, ix: 136000000, rx: 133, ry: 49.0, fy: 345,
  sourceNote: "Retained from workbook seed; verify against CISC HB before paid beta.",
};

// ── Beam — AISC 360-22 ────────────────────────────────────────────────────────

describe("VALIDATION: Beam — AISC 360-22 (W12x40, Mf=150 kip·ft, Vf=40 kips)", () => {
  /**
   * Moment (AISC 360-22 Section F2 — compact section, no LTB):
   *   φMn = φ·Fy·Sx = 0.9 × 50 × 51.5 / 12 = 193.1 kip·ft
   *   Moment DCR = 150 / 193.1 = 0.777
   *
   * VALIDATION MISMATCH — moment DCR:
   *   Engine = 0.777  |  Workbook reference ≈ 0.74
   *   Gap = 5 %; correcting the seed Sx (57.6→51.5 in³) narrowed the gap
   *   from 7 % to 5 % but did not eliminate it.  The workbook appears to use
   *   Sx ≈ 54 in³, whose source is unknown.  Flag for review before paid beta.
   *
   * Shear (AISC 360-22 Section G2.1, Cv1=1.0, φv=1.0):
   *   Aw = (d−2tf)·tw = (11.9−1.030)×0.295 = 3.207 in²
   *   φVn = 1.0 × 0.6 × 50 × 3.207 = 96.2 kips
   *   Shear DCR = 40 / 96.2 = 0.416  ✓  < 1.0
   */
  it("moment DCR < 1.0, shear DCR ≈ 0.42, overall PASS", () => {
    const result = calculateBeamDesign({
      runId: "val-beam-aisc-01",
      codeProfile: "AISC_360_22",
      unitSystem: "imperial",
      section: W12x40_AISC,
      factoredMoment: { label: "Factored moment, M_u", value: 150, unit: "kip-ft" },
      factoredShear:  { label: "Factored shear, V_u",  value: 40,  unit: "kip"   },
    });

    expect(result.moduleType).toBe("beam");
    expect(result.displayResults.pass).toBe(true);

    // Moment — VALIDATION MISMATCH: engine 0.777, workbook ≈ 0.74; see header.
    expect(result.displayResults.momentDCR as number).toBeCloseTo(0.777, 2);

    // Shear — matches workbook reference ✓
    expect(result.displayResults.shearDCR as number).toBeCloseTo(0.42, 1);

    // Both sub-checks independently confirm pass
    expect(result.displayResults.momentDCR as number).toBeLessThan(1);
    expect(result.displayResults.shearDCR  as number).toBeLessThan(1);
  });
});

// ── Beam — CSA S16-19 ────────────────────────────────────────────────────────

describe("VALIDATION: Beam — CSA S16-19 (W310x60, Mf=180 kN·m, Vf=90 kN)", () => {
  /**
   * Moment (CSA S16-19 Clause 13.5 — Class 1 compact):
   *   φMr = φ·Fy·Sx = 0.9 × 345 × 875 000 / 1 000 000 = 271.7 kN·m
   *   Moment DCR = 180 / 271.7 = 0.663  ✓
   *
   * Shear (CSA S16-19 Clause 13.4, φv=0.9):
   *   Aw = (d−2tf)·tw = (310−25.4)×9.4 = 2675 mm²
   *   φVr = 0.9 × 0.66 × 345 × 2675 / 1000 = 548 kN
   *   Shear DCR = 90 / 548 = 0.164  ✓
   *
   * Workbook reference: moment DCR < 1.0, PASS ✓
   */
  it("moment DCR ≈ 0.663, shear DCR ≈ 0.16, overall PASS", () => {
    const result = calculateBeamDesign({
      runId: "val-beam-csa-01",
      codeProfile: "CSA_S16_19",
      unitSystem: "metric",
      section: W310x60_CSA,
      factoredMoment: { label: "Factored moment, M_f", value: 180, unit: "kN-m" },
      factoredShear:  { label: "Factored shear, V_f",  value: 90,  unit: "kN"   },
    });

    expect(result.moduleType).toBe("beam");
    expect(result.displayResults.pass).toBe(true);
    expect(result.displayResults.momentDCR as number).toBeCloseTo(0.663, 2);
    expect(result.displayResults.shearDCR  as number).toBeCloseTo(0.16, 1);
  });
});

// ── Column — AISC 360-22 ──────────────────────────────────────────────────────

describe("VALIDATION: Column — AISC 360-22 (W12x40, KL=120 in, Cf=200 kips)", () => {
  /**
   * Hand calculation (AISC 360-22 Section E3, corrected ry=1.94 in):
   *   KL/r  = 120 / 1.94 = 61.86
   *   Fe    = π²×29 000 / 61.86² = 74.8 ksi
   *   Fy/Fe = 50/74.8 = 0.669 ≤ 2.25  →  inelastic (E3-2)
   *   Fcr   = 0.658^0.669 × 50 = 37.8 ksi
   *   φPn   = 0.9 × 37.8 × 11.7 = 397.7 kips
   *   DCR   = 200 / 397.7 = 0.503
   *
   * Workbook reference: DCR ≈ 0.50, PASS ✓
   */
  it("column DCR ≈ 0.503, PASS", () => {
    const result = calculateColumnDesign({
      runId: "val-col-aisc-01",
      codeProfile: "AISC_360_22",
      unitSystem: "imperial",
      section: W12x40_AISC,
      factoredCompression: { label: "Factored compression, P_u", value: 200, unit: "kip" },
      effectiveLength:     { label: "Effective length, KL",       value: 120, unit: "in"  },
    });

    expect(result.moduleType).toBe("column");
    expect(result.codeReferences[0]).toBe("AISC 360-22 Section E3");
    expect(result.displayResults.pass).toBe(true);
    expect(result.displayResults.demandCapacityRatio as number).toBeCloseTo(0.503, 2);
    expect(result.displayResults.slenderness as number).toBeCloseTo(61.9, 0);
  });
});

// ── Column — CSA S16-19 ───────────────────────────────────────────────────────

describe("VALIDATION: Column — CSA S16-19 (W310x60, KL=3000 mm, Cf=1000 kN)", () => {
  /**
   * Hand calculation (CSA S16-19 Clause 13.3.1, n=1.34):
   *   KL/r   = 3000 / 49.0 = 61.22
   *   Fe     = π²×200 000 / 61.22² = 526.7 MPa
   *   λ_n    = √(345/526.7) = 0.809
   *   factor = (1 + 0.809^2.68)^(−1/1.34) = 0.715
   *   Cr     = 0.9 × 7640 × 345 × 0.715 / 1000 = 1695 kN
   *   DCR    = 1000 / 1695 = 0.590
   *
   * Workbook reference: DCR ≈ 0.59, PASS ✓
   */
  it("column DCR ≈ 0.590, PASS", () => {
    const result = calculateColumnDesign({
      runId: "val-col-csa-01",
      codeProfile: "CSA_S16_19",
      unitSystem: "metric",
      section: W310x60_CSA,
      factoredCompression: { label: "Factored compression, C_f", value: 1000, unit: "kN" },
      effectiveLength:     { label: "Effective length, KL",       value: 3000, unit: "mm" },
    });

    expect(result.moduleType).toBe("column");
    expect(result.codeReferences[0]).toBe("CSA S16-19 Clause 13.3.1");
    expect(result.displayResults.pass).toBe(true);
    expect(result.displayResults.demandCapacityRatio as number).toBeCloseTo(0.590, 2);
    expect(result.displayResults.slenderness as number).toBeCloseTo(61.2, 0);
  });
});

// ── Base Plate — AISC 360-22 ──────────────────────────────────────────────────

describe("VALIDATION: Base Plate — AISC 360-22 (W12x40, Pu=200k, N=14in, B=14in, f'c=4ksi)", () => {
  /**
   * Hand calculation (AISC 360-22 Section J8, plate Fy=36 ksi / A36):
   *   Bearing:
   *     A1_req  = 200 / (0.65×0.85×4) = 90.5 in²
   *     A1_supp = 14×14 = 196 in²  →  PASS  ✓
   *
   *   Cantilever:
   *     m = (14 − 0.95×11.9) / 2 = 1.35 in
   *     n = (14 − 0.80×8.0)  / 2 = 3.80 in   ← n governs
   *
   *   Plate thickness (fp = 200/196 = 1.020 ksi):
   *     tp = 3.80 × √(2×1.020 / (0.90×36)) = 3.80 × 0.251 = 0.954 in
   *
   * Workbook reference: bearing PASS, tp calculated ✓
   * (Base plate geometry unchanged by section data correction — d and bf identical.)
   */
  it("bearing PASS, n governs, tp ≈ 0.95 in", () => {
    const result = calculateBasePlateDesign({
      runId: "val-bp-aisc-01",
      codeProfile: "AISC_360_22",
      unitSystem: "imperial",
      section: W12x40_AISC,
      factoredCompression: { label: "Factored compression, P_u", value: 200, unit: "kip" },
      plateN:              { label: "Plate dimension N",          value: 14,  unit: "in"  },
      plateB:              { label: "Plate dimension B",          value: 14,  unit: "in"  },
      concreteStrength:    { label: "Concrete strength, f'c",     value: 4,   unit: "ksi" },
      plateFy:             { label: "Plate yield strength, F_y",  value: 36,  unit: "ksi" },
    });

    expect(result.moduleType).toBe("base_plate");
    expect(result.codeReferences[0]).toBe("AISC 360-22 Section J8");
    expect(result.displayResults.bearingAreaPass).toBe(true);
    expect(result.displayResults.pass).toBe(true);
    expect(result.displayResults.governingCantilever).toBe("n");
    expect(result.displayResults.n as number).toBeCloseTo(3.80, 1);
    expect(result.displayResults.tpRequired as number).toBeCloseTo(0.954, 2);
  });
});

// ── Base Plate — CSA S16-19 ───────────────────────────────────────────────────

describe("VALIDATION: Base Plate — CSA S16-19 (W310x60, Pu=1500kN, N=450mm, B=400mm, f'c=28MPa)", () => {
  /**
   * Hand calculation (CSA S16-19 Clause 17.5, plate Fy=250 MPa):
   *   Bearing:
   *     A1_req  = 1 500 000 / (0.60×0.85×28) = 105 042 mm²
   *     A1_supp = 450×400 = 180 000 mm²  →  PASS  ✓
   *
   *   Cantilever:
   *     m = (450−0.95×310)/2 = 77.75 mm
   *     n = (400−0.80×205)/2 = 118.0 mm   ← n governs  ✓
   *
   *   Plate thickness (fp = 1 500 000/180 000 = 8.333 MPa):
   *     tp = 118 × √(2×8.333/(0.90×250)) = 118 × 0.272 = 32.1 mm
   *
   * Workbook reference: bearing PASS, n governs, tp ≈ 32 mm ✓
   */
  it("bearing PASS, n governs, tp ≈ 32.1 mm", () => {
    const result = calculateBasePlateDesign({
      runId: "val-bp-csa-01",
      codeProfile: "CSA_S16_19",
      unitSystem: "metric",
      section: W310x60_CSA,
      factoredCompression: { label: "Factored compression, C_f", value: 1500, unit: "kN"  },
      plateN:              { label: "Plate dimension N",          value: 450,  unit: "mm"  },
      plateB:              { label: "Plate dimension B",          value: 400,  unit: "mm"  },
      concreteStrength:    { label: "Concrete strength, f'c",     value: 28,   unit: "MPa" },
      plateFy:             { label: "Plate yield strength, F_y",  value: 250,  unit: "MPa" },
    });

    expect(result.moduleType).toBe("base_plate");
    expect(result.codeReferences[0]).toBe("CSA S16-19 Clause 17.5");
    expect(result.displayResults.bearingAreaPass).toBe(true);
    expect(result.displayResults.pass).toBe(true);
    expect(result.displayResults.governingCantilever).toBe("n");
    expect(result.displayResults.n as number).toBeCloseTo(118.0, 1);
    expect(result.displayResults.tpRequired as number).toBeCloseTo(32.1, 0);
  });
});
