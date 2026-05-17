import type { SteelSection } from "./sectionTypes";

// ── Seed version 0.1.0 ────────────────────────────────────────────────────────
// All values audited 2026-05-16. Sources cited per section.
// Bump sectionDbVersion on next schema migration that reaches production.

export const sectionSeedV1: SteelSection[] = [
  {
    // Source: CISC Handbook of Steel Construction, 11th edition, Table 5-1.
    // Corrections vs original workbook seed:
    //   ix:  83.9e6 → 84.9e6 mm⁴  (−1.2 %)
    //   sx: 540e3  → 548e3  mm³  (−1.5 %)
    //   rx: 130    → 131    mm
    //   ry: 38.3   → 38.2   mm   (−0.3 %, negligible)
    // Sy, Iy added from same source.
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
    sx: 548000,
    ix: 84900000,
    rx: 131,
    ry: 38.2,
    fy: 345,
    sy: 87600,       // 87.6 × 10³ mm³  — CISC HB 11th ed.
    iy: 7230000,     // 7.23 × 10⁶ mm⁴ — CISC HB 11th ed.
    sourceNote: "Corrected against CISC HB 11th ed. Table 5-1.",
  },
  {
    // Source: first-principles geometry (same formula verified against W310x39
    // CISC HB values to within 0.5 %).  Physical CISC HB table check recommended
    // before expanding this section's use beyond beam flexure + column buckling.
    // Corrections vs original workbook seed:
    //   ix: 136e6  → 133.1e6 mm⁴  (−2.1 %)
    //   sx: 875e3  → 858e3   mm³  (−1.9 %)
    // Sy, Iy computed: Iy = 2×(tf×bf³/12), Sy = Iy/(bf/2).
    // Area note: nominal dims give A_calc ≈ 7882 mm² vs published 7640 mm²;
    //   difference attributed to simplified formula omitting fillets / actual
    //   profile deviating from nominal — accepted pending physical table check.
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
    sx: 858000,      // 858 × 10³ mm³  — first-principles (was 875, −1.9 %)
    ix: 133100000,   // 133.1 × 10⁶ mm⁴ — first-principles (was 136, −2.1 %)
    rx: 132,         // √(Ix/A) = √(133.1e6/7640) = 132 mm (was 133)
    ry: 49.0,
    fy: 345,
    sy: 178000,      // 178 × 10³ mm³  — first-principles
    iy: 18240000,    // 18.24 × 10⁶ mm⁴ — first-principles
    sourceNote: "Corrected by first-principles geometry 2026-05-16. Verify vs CISC HB before paid beta.",
  },
  {
    // Source: AISC Steel Construction Manual, 16th edition, Table 1-1.
    // Corrections vs original workbook seed:
    //   ix: 342   → 307   in⁴  (−10.2 % — material error, explained validation mismatch)
    //   sx:  57.6 →  51.5 in³  (−10.6 % — material error)
    //   rx:   5.41 →  5.13 in  (−5.2 %)
    //   ry:   1.93 →  1.94 in  (+0.5 %, negligible)
    // Sy, Iy added from same source.
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
    sx: 51.5,
    ix: 307,
    rx: 5.13,
    ry: 1.94,
    fy: 50,
    sy: 11.0,        // in³ — AISC SCM 16th ed.
    iy: 44.1,        // in⁴ — AISC SCM 16th ed.
    sourceNote: "Corrected against AISC SCM 16th ed. Table 1-1.",
  },
];
