import { describe, expect, it } from "vitest";
import { calculateBeamServiceability, type BeamServiceabilityInput } from "../../src/engine/beamServiceability";
import { EngineError } from "../../src/engine/engineError";

const input: BeamServiceabilityInput = {
  spanMm: 6000,
  elasticModulusMPa: 200000,
  inertiaMm4: 800000000,
  serviceDeadLoadNPerMm: 10,
  serviceLiveLoadNPerMm: 20,
  liveLimitRatio: 360,
  totalLimitRatio: 240,
};

describe("calculateBeamServiceability", () => {
  it("matches independently evaluated full-span UDL deflections in N/mm and mm", () => {
    // 6 m, 200 GPa, I = 0.0008 m^4; 20 kN/m live, 30 kN/m total:
    // SI-metre evaluation gives 0.002109375 m live and 0.0031640625 m total.
    const result = calculateBeamServiceability(input);
    expect(result.liveDeflectionMm).toBeCloseTo(2.109375, 12);
    expect(result.totalDeflectionMm).toBeCloseTo(3.1640625, 12);
    expect(result.liveLimitMm).toBeCloseTo(16.666666666666668, 12);
    expect(result.totalLimitMm).toBe(25);
    expect(result.liveDCR).toBeCloseTo(0.1265625, 12);
    expect(result.totalDCR).toBeCloseTo(0.1265625, 12);
    expect(result).toMatchObject({ livePass: true, totalPass: true, pass: true });
  });

  it("permits zero live load and checks only the nonzero total deflection", () => {
    expect(calculateBeamServiceability({ ...input, serviceLiveLoadNPerMm: 0 })).toMatchObject({
      liveDeflectionMm: 0, liveDCR: 0, livePass: true, totalDeflectionMm: 1.0546875, pass: true,
    });
  });

  it("permits zero dead load without adding implicit self-weight or load factors", () => {
    const result = calculateBeamServiceability({ ...input, serviceDeadLoadNPerMm: 0 });
    expect(result.totalDeflectionMm).toBe(result.liveDeflectionMm);
    expect(result.liveDeflectionMm).toBe(2.109375);
  });

  it.each(["live", "total"] as const)("fails overall when only the %s limit is exceeded", (kind) => {
    const result = calculateBeamServiceability({ ...input, [`${kind}LimitRatio`]: 3000 });
    expect(result.livePass).toBe(kind !== "live");
    expect(result.totalPass).toBe(kind !== "total");
    expect(result.pass).toBe(false);
  });

  it("passes exact equality but does not round a small exceedance down to a pass", () => {
    // L=8, E=5, I=1, w=3/32 gives delta=1 exactly; limit L/8=1.
    const boundary = { ...input, spanMm: 8, elasticModulusMPa: 5, inertiaMm4: 1,
      serviceDeadLoadNPerMm: 0, serviceLiveLoadNPerMm: 3 / 32, liveLimitRatio: 8, totalLimitRatio: 8 };
    expect(calculateBeamServiceability(boundary)).toMatchObject({ liveDCR: 1, totalDCR: 1, pass: true });
    const exceeded = calculateBeamServiceability({ ...boundary, serviceLiveLoadNPerMm: (3 / 32) * (1 + 1e-10) });
    expect(exceeded.liveDCR).toBeGreaterThan(1);
    expect(exceeded.pass).toBe(false);
  });

  it("has L^4 load-response scaling and inverse E/I scaling without mutating inputs", () => {
    const frozen = Object.freeze({ ...input });
    const base = calculateBeamServiceability(frozen);
    expect(calculateBeamServiceability({ ...input, spanMm: 12000 }).liveDeflectionMm).toBe(base.liveDeflectionMm * 16);
    expect(calculateBeamServiceability({ ...input, elasticModulusMPa: 400000 }).liveDeflectionMm).toBe(base.liveDeflectionMm / 2);
    expect(calculateBeamServiceability({ ...input, inertiaMm4: 1600000000 }).liveDeflectionMm).toBe(base.liveDeflectionMm / 2);
    expect(frozen).toEqual(input);
  });

  it.each(["spanMm", "elasticModulusMPa", "inertiaMm4", "liveLimitRatio", "totalLimitRatio"] as const)("rejects invalid positive input %s", (field) => {
    for (const value of [0, -1, NaN, Infinity, -Infinity, undefined, "200000"]) {
      expect(() => calculateBeamServiceability({ ...input, [field]: value } as unknown as BeamServiceabilityInput)).toThrow(EngineError);
    }
  });

  it.each(["serviceDeadLoadNPerMm", "serviceLiveLoadNPerMm"] as const)("rejects invalid nonnegative load %s", (field) => {
    for (const value of [-1, NaN, Infinity, -Infinity, undefined, "20"]) {
      expect(() => calculateBeamServiceability({ ...input, [field]: value } as unknown as BeamServiceabilityInput)).toThrow(EngineError);
    }
  });

  it("rejects a meaningless all-zero service load", () => {
    expect(() => calculateBeamServiceability({ ...input, serviceDeadLoadNPerMm: 0, serviceLiveLoadNPerMm: 0 })).toThrow(/total service load/i);
  });

  it.each([
    { spanMm: 1e100 },
    { elasticModulusMPa: 1e308 },
    { serviceDeadLoadNPerMm: Number.MAX_VALUE, serviceLiveLoadNPerMm: Number.MAX_VALUE },
    { serviceLiveLoadNPerMm: 1e300 },
    { inertiaMm4: Number.MIN_VALUE, elasticModulusMPa: Number.MIN_VALUE },
    { spanMm: Number.MIN_VALUE },
    { liveLimitRatio: Number.MIN_VALUE },
    { serviceLiveLoadNPerMm: Number.MIN_VALUE, serviceDeadLoadNPerMm: 0 },
  ])("rejects unrepresentable arithmetic rather than returning a misleading pass: %j", (overrides) => {
    expect(() => calculateBeamServiceability({ ...input, ...overrides })).toThrow(EngineError);
  });
});
