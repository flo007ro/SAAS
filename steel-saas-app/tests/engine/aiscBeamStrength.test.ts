import { describe, expect, it } from "vitest";
import { calculateAiscBeamStrength, type AiscBeamStrengthInput } from "../../src/engine/aiscBeamStrength";

const inch = 25.4;
const ksi = 6.894757293168361;
const kipIn = ksi * inch ** 3;
const assumptions = {
  doublySymmetricRolledW: true, majorAxisBending: true,
  torsionRestrainedEnds: true, compressionFlangeBracedAtSegmentEnds: true,
  loadThroughShearCenter: true,
};
// AISC v16.0 Companion, F.1-1B/F.1-2B/F.1-3B, W18x50.
// https://www.aisc.org/media/kybevlwy/first-semester-design-examples-v160.pdf
function fixture(): AiscBeamStrengthInput {
  return {
    section: {
      fyMPa: 50 * ksi, sxMm3: 88.9 * inch ** 3, zxMm3: 101 * inch ** 3,
      iyMm4: 40.1 * inch ** 4, ryMm: 1.65 * inch,
      jMm4: 1.24 * inch ** 4, cwMm6: 3040 * inch ** 6,
      rtsMm: 1.98 * inch, hoMm: 17.4 * inch,
      flangeSlenderness: 6.60, webSlenderness: 43.1,
    }, lbMm: 17.5 * 12 * inch, cb: 1.30, applicability: { ...assumptions },
  };
}
function checked(input = fixture()) {
  const result = calculateAiscBeamStrength(input);
  expect(result.state).toBe("checked");
  if (result.state !== "checked") throw new Error(result.details.join("; "));
  return result;
}

describe("AISC published-baseline beam flexural strength", () => {
  it("matches official F.1-3B elastic LTB benchmark within published rounding", () => {
    const r = checked();
    expect(r.classification).toEqual({ flange: "compact", web: "compact" });
    expect(r.lpMm / (12 * inch)).toBeCloseTo(5.83, 1);
    expect(r.lrMm / (12 * inch)).toBeCloseTo(16.9, 0);
    expect(Math.abs(r.nominalMomentNmm / (12 * kipIn) - 320)).toBeLessThan(2);
    expect(Math.abs(r.designMomentNmm / (12 * kipIn) - 288)).toBeLessThan(2);
    expect(r.governing).toBe("elastic_ltb");
    expect(r.references).toContain("AISC 360-22 F2-3, F2-4");
    expect(r.publicationBaseline).toContain("2022");
    expect(r.errataReview).toBe("reviewed_listed_errata_2026_09_23");
    expect(r).not.toHaveProperty("pass");
  });

  it("matches official F.1-1B plastic moment for a sufficiently braced segment", () => {
    const input = fixture(); input.lbMm = 100;
    const r = checked(input);
    expect(r.nominalMomentNmm / kipIn).toBeCloseTo(5050, 6);
    expect(r.governing).toBe("yielding");
    expect(r.designMomentNmm).toBeCloseTo(0.9 * r.nominalMomentNmm, 5);
  });

  it("matches official F.1-2B inelastic LTB benchmark within published rounding", () => {
    const input = fixture(); input.lbMm = 11.7 * 12 * inch; input.cb = 1.01;
    const result = checked(input);
    expect(result.governing).toBe("inelastic_ltb");
    // Published example F-11 reports 304 kip-ft using rounded intermediate values.
    expect(Math.abs(result.designMomentNmm / (12 * kipIn) - 304)).toBeLessThan(2);
  });

  it("uses the inelastic interpolation at Lr and yielding at Lp", () => {
    const input = fixture(); input.cb = 1;
    const limits = checked(input);
    input.lbMm = limits.lpMm;
    expect(checked(input).governing).toBe("yielding");
    input.lbMm = limits.lrMm;
    const atLr = checked(input);
    expect(atLr.governing).toBe("inelastic_ltb");
    expect(atLr.nominalMomentNmm).toBeCloseTo(0.7 * input.section.fyMPa! * input.section.sxMm3!, 4);
    input.lbMm = limits.lrMm * (1 + 1e-8);
    expect(checked(input).governing).toBe("elastic_ltb");
  });

  it("interpolates F2-2 and caps Cb-enhanced strength at Mp", () => {
    const input = fixture(); input.cb = 1;
    const r = checked(input); input.lbMm = (r.lpMm + r.lrMm) / 2;
    const mp = input.section.fyMPa! * input.section.zxMm3!;
    expect(checked(input).nominalMomentNmm).toBeCloseTo((mp + 0.7 * input.section.fyMPa! * input.section.sxMm3!) / 2, 4);
    input.cb = 3;
    expect(checked(input).nominalMomentNmm).toBe(mp);
    delete input.cb;
    expect(checked(input).cb).toBe(1);
  });

  it("routes exact B4 flange and web boundaries without rounding", () => {
    const input = fixture(); input.lbMm = 100;
    const root = Math.sqrt(200000 / input.section.fyMPa!);
    input.section.flangeSlenderness = 0.38 * root;
    input.section.webSlenderness = 3.76 * root;
    expect(checked(input).classification).toEqual({ flange: "compact", web: "compact" });
    input.section.flangeSlenderness += 1e-8;
    expect(checked(input).classification.flange).toBe("noncompact");
    input.section.flangeSlenderness = root;
    expect(checked(input).classification.flange).toBe("noncompact");
    input.section.flangeSlenderness += 1e-8;
    expect(calculateAiscBeamStrength(input).state).toBe("not_checked");
    input.section.flangeSlenderness = 6;
    for (const [ratio, classification] of [[3.76 * root + 1e-8, "noncompact"], [5.70 * root, "noncompact"], [5.70 * root + 1e-8, "slender"]] as const) {
      input.section.webSlenderness = ratio;
      const r = calculateAiscBeamStrength(input);
      expect(r.state).toBe("not_checked");
      expect(r.classification.web).toBe(classification);
      expect(r.nominalMomentNmm).toBeNull();
    }
  });

  it("uses F3-1 for noncompact flanges and minimum with LTB", () => {
    const input = fixture(); input.cb = 1; input.lbMm = 100;
    const root = Math.sqrt(200000 / input.section.fyMPa!);
    input.section.flangeSlenderness = (0.38 * root + root) / 2;
    const r = checked(input);
    const mp = input.section.fyMPa! * input.section.zxMm3!;
    expect(r.nominalMomentNmm).toBeCloseTo((mp + 0.7 * input.section.fyMPa! * input.section.sxMm3!) / 2, 4);
    expect(r.governing).toBe("flange_local_buckling");
    expect(r.references).toContain("AISC 360-22 F3-1");
    input.lbMm = 30000;
    expect(checked(input).governing).toBe("elastic_ltb");
  });

  it("derives rts from authoritative Iy and Cw if no rts is supplied", () => {
    const input = fixture(); delete input.section.rtsMm;
    expect(checked(input).rtsMm).toBeCloseTo(Math.sqrt(Math.sqrt(input.section.iyMm4! * input.section.cwMm6!) / input.section.sxMm3!), 8);
  });

  it("keeps LTB capacity separate when only flange local buckling fails a demand", () => {
    const input = fixture(); input.cb = 1; input.lbMm = 100;
    const root = Math.sqrt(200000 / input.section.fyMPa!);
    input.section.flangeSlenderness = (0.38 * root + root) / 2;
    const r = checked(input);
    const mp = input.section.fyMPa! * input.section.zxMm3!;
    expect(r.ltbNominalMomentNmm).toBe(mp);
    expect(r.ltbDesignMomentNmm).toBe(0.9 * mp);
    expect(r.localNominalMomentNmm).toBe(r.nominalMomentNmm);
    expect(r.localDesignMomentNmm).toBe(r.designMomentNmm);
    const demandNmm = (r.designMomentNmm + r.ltbDesignMomentNmm) / 2;
    expect(demandNmm / r.designMomentNmm).toBeGreaterThan(1);
    expect(demandNmm / r.ltbDesignMomentNmm).toBeLessThan(1);
    input.lbMm = 30000;
    const long = checked(input);
    expect(long.ltbNominalMomentNmm).toBe(long.nominalMomentNmm);
    expect(long.localNominalMomentNmm!).toBeGreaterThan(long.ltbNominalMomentNmm);
  });

  it("has no local stage for compact sections and no stages for unsupported sections", () => {
    const input = fixture();
    const r = checked(input);
    expect(r.ltbNominalMomentNmm).toBe(r.nominalMomentNmm);
    expect(r.localNominalMomentNmm).toBeNull();
    expect(r.localDesignMomentNmm).toBeNull();
    input.section.webSlenderness = 1000;
    const unsupported = calculateAiscBeamStrength(input);
    expect(unsupported.state).toBe("not_checked");
    expect(unsupported.ltbNominalMomentNmm).toBeNull();
    expect(unsupported.ltbDesignMomentNmm).toBeNull();
    expect(unsupported.localNominalMomentNmm).toBeNull();
    expect(unsupported.localDesignMomentNmm).toBeNull();
  });

  it.each(Object.keys(assumptions) as (keyof typeof assumptions)[])("requires explicit applicability: %s", (key) => {
    const input = fixture(); input.applicability![key] = false;
    const r = calculateAiscBeamStrength(input);
    expect(r.state).toBe("not_checked"); expect(r.designMomentNmm).toBeNull();
    expect(r.classification).toEqual({ flange: "compact", web: "compact" });
    delete input.applicability;
    expect(calculateAiscBeamStrength(input).state).toBe("not_checked");
  });

  it.each([NaN, Infinity, -1, 0.99, 3.01])("rejects invalid supplied Cb %s", (cb) => {
    const input = fixture(); input.cb = cb;
    expect(calculateAiscBeamStrength(input).state).toBe("not_checked");
  });

  it.each([NaN, Infinity, -1, 0])("rejects invalid Lb %s", (lbMm) => {
    const input = fixture(); input.lbMm = lbMm;
    expect(calculateAiscBeamStrength(input).state).toBe("not_checked");
  });

  it.each(["fyMPa", "sxMm3", "zxMm3", "ryMm", "jMm4", "hoMm", "flangeSlenderness", "webSlenderness"] as const)("does not fabricate missing/invalid %s", (key) => {
    for (const value of [undefined, NaN, Infinity, -1, 0]) {
      const input = fixture(); input.section[key] = value;
      const r = calculateAiscBeamStrength(input);
      expect(r.state).toBe("not_checked"); expect(r.nominalMomentNmm).toBeNull();
    }
  });

  it("rejects missing rts and its derivation properties, and overflowing calculations", () => {
    const input = fixture(); delete input.section.rtsMm; delete input.section.cwMm6;
    expect(calculateAiscBeamStrength(input).state).toBe("not_checked");
    const huge = fixture(); huge.section.zxMm3 = Number.MAX_VALUE;
    expect(calculateAiscBeamStrength(huge).state).toBe("not_checked");
  });

  it("does not mask overflowing elastic-LTB intermediates with the Mp cap", () => {
    const input = fixture();
    input.section = { fyMPa: 345, sxMm3: 1e6, zxMm3: 1.2e6,
      iyMm4: 1, ryMm: 1e-80, jMm4: 1e158, cwMm6: 1,
      rtsMm: 1e-80, hoMm: 1, flangeSlenderness: 6, webSlenderness: 40 };
    input.lbMm = 1; input.cb = 1;
    const result = calculateAiscBeamStrength(input);
    expect(result.state).toBe("not_checked");
    expect(result.designMomentNmm).toBeNull();
    expect(result.ltbDesignMomentNmm).toBeNull();
  });
});
