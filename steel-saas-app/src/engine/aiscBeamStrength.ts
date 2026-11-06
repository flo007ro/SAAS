/** Pure LRFD major-axis member flexure only; no demand or overall-design verdict.
 * Published baseline: ANSI/AISC 360-22, B4.1b/Table B4.1b, F1, F2 and F3.2(a).
 * https://vpn2.modernsteel.com/globalassets/product-files-not-searched/publications/standards/a360-22w.pdf
 * Benchmarks: AISC v16.0 Companion F.1-1B through F.1-3B.
 * https://www.aisc.org/media/kybevlwy/first-semester-design-examples-v160.pdf
 * Listed January 2025 and September 2026 errata were visually reviewed;
 * neither changes the supported B4/F2/F3 provisions. This is not project-specific
 * professional engineering approval. See the beam-checks verification notes.
 * https://www.aisc.org/media/b2fhqynp/errata_360-22_01232025.pdf
 * https://www.aisc.org/media/kgjb33g5/errata_360-22_09232026.pdf
 */
export type AiscBeamSection = {
  fyMPa: number; sxMm3: number; zxMm3: number; iyMm4: number;
  ryMm: number; jMm4: number; cwMm6: number; rtsMm: number; hoMm: number;
  // B4.1b rolled-W ratios: bf/(2tf), h/tw with h=d-2kdes, not d-2tf.
  flangeSlenderness: number; webSlenderness: number;
};

export type AiscBeamApplicability = {
  doublySymmetricRolledW: boolean;
  majorAxisBending: boolean;
  torsionRestrainedEnds: boolean;
  compressionFlangeBracedAtSegmentEnds: boolean;
  // Excludes destabilizing top-flange loading outside the shear center.
  loadThroughShearCenter: boolean;
};

export type AiscBeamStrengthInput = {
  section: Partial<AiscBeamSection>;
  lbMm: number;
  // Default 1 is conservative only within the confirmed applicability above.
  cb?: number;
  applicability?: Partial<AiscBeamApplicability>;
};

type ElementClass = "compact" | "noncompact" | "slender" | "unknown";
type Governing = "yielding" | "inelastic_ltb" | "elastic_ltb" | "flange_local_buckling";
type ResultBase = {
  classification: { flange: ElementClass; web: ElementClass };
  details: string[];
  references: string[];
  publicationBaseline: string;
  errataReview: "pending_independent_review" | "reviewed_listed_errata_2026_09_23";
};
export type AiscBeamStrengthResult = ResultBase & (
  | { state: "checked"; nominalMomentNmm: number; designMomentNmm: number;
      ltbNominalMomentNmm: number; ltbDesignMomentNmm: number;
      localNominalMomentNmm: number | null; localDesignMomentNmm: number | null;
      lpMm: number; lrMm: number; rtsMm: number; cb: number; governing: Governing }
  | { state: "not_checked"; nominalMomentNmm: null; designMomentNmm: null;
      ltbNominalMomentNmm: null; ltbDesignMomentNmm: null;
      localNominalMomentNmm: null; localDesignMomentNmm: null;
      lpMm: null; lrMm: null; rtsMm: null; cb: null; governing: null }
);

const E = 200000; // AISC-specified SI modulus, MPa; do not convert 29,000 ksi here.
const applicabilityKeys: (keyof AiscBeamApplicability)[] = [
  "doublySymmetricRolledW", "majorAxisBending", "torsionRestrainedEnds",
  "compressionFlangeBracedAtSegmentEnds", "loadThroughShearCenter",
];
const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
function classify(ratio: unknown, lp: number, lr: number): ElementClass {
  return !positive(ratio) || !positive(lp) || !positive(lr) ? "unknown"
    : ratio <= lp ? "compact" : ratio <= lr ? "noncompact" : "slender";
}

export function calculateAiscBeamStrength(input: AiscBeamStrengthInput): AiscBeamStrengthResult {
  const s = input.section;
  const root = positive(s.fyMPa) ? Math.sqrt(E / s.fyMPa) : NaN;
  const base: ResultBase = {
    classification: {
      flange: classify(s.flangeSlenderness, 0.38 * root, root),
      web: classify(s.webSlenderness, 3.76 * root, 5.70 * root),
    },
    details: ["Member flexural strength only; shear, serviceability, connections, bracing design and overall adequacy are not assessed."],
    references: ["AISC 360-22 B4.1b, Table B4.1b cases 10 and 15", "AISC 360-22 F1"],
    publicationBaseline: "ANSI/AISC 360-22 (2022 published baseline)",
    errataReview: "reviewed_listed_errata_2026_09_23",
  };
  const skip = (reason: string): AiscBeamStrengthResult => ({
    ...base, state: "not_checked", nominalMomentNmm: null, designMomentNmm: null,
    ltbNominalMomentNmm: null, ltbDesignMomentNmm: null,
    localNominalMomentNmm: null, localDesignMomentNmm: null,
    lpMm: null, lrMm: null, rtsMm: null, cb: null, governing: null,
    details: [...base.details, reason],
  });
  for (const key of applicabilityKeys) {
    if (input.applicability?.[key] !== true) return skip(`Applicability must be confirmed: ${key}.`);
  }
  for (const key of ["fyMPa", "sxMm3", "zxMm3", "ryMm", "jMm4", "hoMm", "flangeSlenderness", "webSlenderness"] as const) {
    if (!positive(s[key])) return skip(`Missing or invalid section property: ${key}.`);
  }
  if (!positive(input.lbMm)) return skip("Lb must be a finite positive segment length in mm.");
  const cb = input.cb === undefined ? 1 : input.cb;
  if (!Number.isFinite(cb) || cb < 1 || cb > 3) return skip("Supplied Cb must be finite and within 1..3.");
  if (base.classification.web !== "compact") {
    return skip("Noncompact/slender webs require F4/F5, outside this module's supported scope.");
  }
  if (base.classification.flange !== "compact" && base.classification.flange !== "noncompact") {
    return skip("Slender/unknown flanges are outside the supported F2/F3-1 scope.");
  }
  // F2-7: only derive from supplied authoritative properties, never geometry guesses.
  let rts = s.rtsMm;
  if (rts === undefined) {
    if (!positive(s.iyMm4) || !positive(s.cwMm6)) return skip("rts or positive Iy and Cw are required.");
    rts = Math.sqrt(Math.sqrt(s.iyMm4 * s.cwMm6) / s.sxMm3!);
    base.references.push("AISC 360-22 F2-7");
  }
  if (!positive(rts)) return skip("rts must be finite and positive.");
  const fy = s.fyMPa!;
  const sx = s.sxMm3!;
  const mp = fy * s.zxMm3!;
  if (s.zxMm3! < sx) return skip("Zx cannot be less than Sx for this supported section.");
  const q = s.jMm4! / (sx * s.hoMm!); // F2-8a: c=1 for doubly symmetric I-sections.
  const lp = 1.76 * s.ryMm! * root;
  const lr = 1.95 * rts * E / (0.7 * fy)
    * Math.sqrt(q + Math.sqrt(q ** 2 + 6.76 * (0.7 * fy / E) ** 2));
  if (![mp, q, lp, lr].every(positive) || lr <= lp) return skip("Invalid or overflowing section-derived strength/length limits.");
  base.references.push("AISC 360-22 F2-1", "AISC 360-22 F2-5, F2-6, F2-8a");
  let nominal = mp;
  let governing: Governing = "yielding";
  if (input.lbMm > lp && input.lbMm <= lr) {
    const ltb = cb * (mp - (mp - 0.7 * fy * sx) * (input.lbMm - lp) / (lr - lp));
    if (!positive(ltb)) return skip("Invalid or overflowing inelastic-LTB strength.");
    nominal = Math.min(mp, ltb);
    if (ltb < mp) governing = "inelastic_ltb";
    base.references.push("AISC 360-22 F2-2");
  } else if (input.lbMm > lr) {
    const slenderness = input.lbMm / rts;
    const slendernessSquared = slenderness ** 2;
    const radicand = 1 + 0.078 * q * slendernessSquared;
    if (![slenderness, slendernessSquared, radicand].every(positive)) {
      return skip("Invalid or overflowing elastic-LTB intermediates.");
    }
    const fcr = cb * Math.PI ** 2 * E / slendernessSquared * Math.sqrt(radicand);
    const elasticMoment = fcr * sx;
    // Check before capping: Math.min(Mp, Infinity) would hide a failed calculation.
    if (![fcr, elasticMoment].every(positive)) return skip("Invalid or overflowing elastic-LTB strength.");
    nominal = Math.min(mp, elasticMoment);
    if (nominal < mp) governing = "elastic_ltb";
    base.references.push("AISC 360-22 F2-3, F2-4");
  }
  // Retain the Mp-capped F2 envelope before the separate F3-1 reduction.
  const ltbNominal = nominal;
  let localNominal: number | null = null;
  if (base.classification.flange === "noncompact") {
    const local = mp - (mp - 0.7 * fy * sx)
      * (s.flangeSlenderness! - 0.38 * root) / (root - 0.38 * root);
    localNominal = local;
    if (local < nominal) { nominal = local; governing = "flange_local_buckling"; }
    base.references.push("AISC 360-22 F3-1");
  }
  const design = 0.9 * nominal;
  const ltbDesign = 0.9 * ltbNominal;
  const localDesign = localNominal === null ? null : 0.9 * localNominal;
  if (![nominal, design, ltbNominal, ltbDesign, ...(localNominal === null ? [] : [localNominal, localDesign])].every(positive)) {
    return skip("Nonfinite or nonpositive calculated strength; no capacity issued.");
  }
  base.details.push(`Cb=${cb}${input.cb === undefined ? " (conservative default)" : " (caller-supplied segment factor)"}; Lb=${input.lbMm} mm; E=${E} MPa; phi_b=0.90.`);
  return { ...base, state: "checked", nominalMomentNmm: nominal, designMomentNmm: design,
    ltbNominalMomentNmm: ltbNominal, ltbDesignMomentNmm: ltbDesign,
    localNominalMomentNmm: localNominal, localDesignMomentNmm: localDesign,
    lpMm: lp, lrMm: lr, rtsMm: rts, cb, governing };
}
