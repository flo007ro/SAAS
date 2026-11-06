import { EngineError } from "./engineError";

/**
 * Simply supported, prismatic, linearly elastic Euler-Bernoulli beam;
 * downward full-span UDL only, constant E and bending-axis I, small deflections.
 * Maximum downward deflection is at midspan: delta = 5*w*L^4/(384*E*I).
 * Source: BCSA Handbook of Structural Steelwork, publication 55/13,
 * General Design Data, "Simply supported beam - uniform load on full span":
 * delta_max = 5*W*L^3/(384*E*I), with total load W = w*L.
 * https://www.steelconstruction.info/images/6/65/Handbook_of_Structural_Steelwork_EE_55-13.pdf
 *
 * Inputs MUST be mm, MPa (= N/mm^2), mm^4 and N/mm; no unit inference or
 * conversion is performed. Scalar values cannot reveal incorrectly supplied units.
 * Supply unfactored service dead/live loads, including self-weight in dead load
 * where applicable. No load factors, automatic self-weight or camber are applied.
 * Limits are caller-selected denominators R in L/R, not prescribed code limits.
 * No point/partial/pattern loads, continuity, shear deformation, vibration,
 * composite action, time-dependent effects, strength or stability checks.
 * A pass applies only to these two instantaneous elastic deflection checks.
 */
export type BeamServiceabilityInput = {
  spanMm: number;
  elasticModulusMPa: number;
  inertiaMm4: number;
  serviceDeadLoadNPerMm: number;
  serviceLiveLoadNPerMm: number;
  liveLimitRatio: number;
  totalLimitRatio: number;
};

export type BeamServiceabilityResult = {
  liveDeflectionMm: number;
  totalDeflectionMm: number;
  liveLimitMm: number;
  totalLimitMm: number;
  liveDCR: number;
  totalDCR: number;
  livePass: boolean;
  totalPass: boolean;
  pass: boolean;
};

export function calculateBeamServiceability(input: BeamServiceabilityInput): BeamServiceabilityResult {
  for (const key of ["spanMm", "elasticModulusMPa", "inertiaMm4", "liveLimitRatio", "totalLimitRatio"] as const) {
    if (!Number.isFinite(input[key]) || input[key] <= 0) {
      throw new EngineError("INVALID_INPUT", `${key} must be a positive finite number in the documented SI units.`);
    }
  }
  for (const key of ["serviceDeadLoadNPerMm", "serviceLiveLoadNPerMm"] as const) {
    if (!Number.isFinite(input[key]) || input[key] < 0) {
      throw new EngineError("INVALID_INPUT", `${key} must be a nonnegative finite service load in N/mm.`);
    }
  }

  const totalLoad = input.serviceDeadLoadNPerMm + input.serviceLiveLoadNPerMm;
  if (totalLoad === 0) {
    throw new EngineError("INVALID_INPUT", "Total service load must be greater than zero.");
  }

  // Reject unrepresentable intermediates as well as results: an infinite
  // denominator or an underflowed positive quantity can otherwise produce a false pass.
  function positiveFinite(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new EngineError("NUMERIC_RANGE", "Serviceability inputs exceed the calculation's numeric range.");
    }
    return value;
  }
  positiveFinite(totalLoad);
  const spanFourth = positiveFinite(input.spanMm ** 4);
  const denominator = positiveFinite(384 * positiveFinite(input.elasticModulusMPa * input.inertiaMm4));
  const deflection = (load: number): number => load === 0
    ? 0
    : positiveFinite(positiveFinite(positiveFinite(5 * load) * spanFourth) / denominator);

  const liveDeflectionMm = deflection(input.serviceLiveLoadNPerMm);
  const totalDeflectionMm = deflection(totalLoad);
  const liveLimitMm = positiveFinite(input.spanMm / input.liveLimitRatio);
  const totalLimitMm = positiveFinite(input.spanMm / input.totalLimitRatio);
  const liveDCR = liveDeflectionMm === 0 ? 0 : positiveFinite(liveDeflectionMm / liveLimitMm);
  const totalDCR = positiveFinite(totalDeflectionMm / totalLimitMm);
  const livePass = liveDCR <= 1;
  const totalPass = totalDCR <= 1;

  return { liveDeflectionMm, totalDeflectionMm, liveLimitMm, totalLimitMm,
    liveDCR, totalDCR, livePass, totalPass, pass: livePass && totalPass };
}
