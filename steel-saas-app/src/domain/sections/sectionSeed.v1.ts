import type { SteelSection } from "./sectionTypes";

// ── Seed version 0.1.0 ────────────────────────────────────────────────────────
// Values below have been audited against the sources noted in each sourceNote.
// Any remaining uncertainty is called out inline.
// DO NOT modify these values without updating sourceNote and sectionDbVersion.

export const sectionSeedV1: SteelSection[] = [
  {
    // ── CORRECTIONS vs original workbook seed ──────────────────────────────────
    // Source: CISC Handbook of Steel Construction, 11th edition, Table 5-1.
    //   ix:  83.9e6 → 84.9e6 mm⁴  (−1.2 % in original)
    //   sx: 540e3  → 548e3  mm³  (−1.5 % in original)
    //   rx: 130    → 131    mm   (−0.8 % in original)
    //   ry: 38.3   → 38.2   mm   (+0.3 % in original — negligible)
    // Sy = 87.6×10³ mm³, Iy = 7.23×10⁶ mm⁴ (not yet in schema; noted for reference)
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
    sourceNote: "Corrected against CISC HB 11th ed. Table 5-1. Cross-check Sy/Iy before paid beta.",
  },
  {
    // ── W310x60: values retained from workbook seed pending CISC verification ──
    // First-principles calculation (ignoring fillets) gives Ix ≈ 133×10⁶ mm⁴,
    // Sx ≈ 858×10³ mm³, ry ≈ 48.9 mm — approx. 2 % below seed values.
    // Difference is within the accuracy of the simplified formula; CISC HB table
    // values are required before correcting. Flag: VERIFY BEFORE PAID BETA.
    // Sy ≈ 178×10³ mm³, Iy ≈ 18.2×10⁶ mm⁴ (estimated; not yet in schema)
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
    sourceNote: "Retained from workbook seed. Requires verification against CISC HB 11th ed. before paid beta.",
  },
  {
    // ── CORRECTIONS vs original workbook seed ──────────────────────────────────
    // Source: AISC Steel Construction Manual, 16th edition, Table 1-1.
    //   ix: 342   → 307   in⁴  (−10.2 % in original — material error)
    //   sx:  57.6 →  51.5 in³  (−10.6 % in original — material error; explains
    //                            validation DCR mismatch vs workbook reference)
    //   rx:   5.41 →  5.13 in  (−5.2 % in original)
    //   ry:   1.93 →  1.94 in  (+0.5 % in original — negligible)
    // Sy = 11.0 in³, Iy = 44.1 in⁴ (not yet in schema; noted for reference)
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
    sourceNote: "Corrected against AISC SCM 16th ed. Table 1-1. Previous ix/sx/rx had ~10% error.",
  },
];
