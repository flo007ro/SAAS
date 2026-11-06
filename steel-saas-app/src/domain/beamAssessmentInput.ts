/** Explicit engineer-supplied inputs only; parsing makes no engineering verification claim. */
export interface BeamAssessmentInput {
  supportModel: "simply_supported_udl";
  beamRestraint: "verified" | "unknown";
  spanMm: number;
  unbracedLengthMm: number;
  serviceDeadLoadNPerMm: number;
  serviceLiveLoadNPerMm: number;
  liveDeflectionLimit: number;
  totalDeflectionLimit: number;
  materialYieldStrengthMPa: number;
  /** AISC-only supplied value; no implicit default or CSA equivalent. */
  aiscCb?: number;
}

const assessmentKeys = [
  "supportModel", "beamRestraint", "span", "unbracedLength", "serviceDeadLoad",
  "serviceLiveLoad", "liveDeflectionLimit", "totalDeflectionLimit",
  "materialYieldStrength", "aiscCb", "momentGradientFactor",
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads inputJson.displayValues independently of the existing required beam fields.
 * An absent group returns undefined (not checked); a partial/invalid group throws.
 * beamRestraint is an affirmation, not proof: consumers must gate LTB accordingly.
 */
export function parseBeamAssessmentInput(input: unknown): BeamAssessmentInput | undefined {
  if (!record(input)) throw new Error("Beam input must be an object.");
  const values = input.displayValues;
  if (values === undefined) return undefined;
  if (!record(values)) throw new Error("displayValues must be an object.");
  const present = (key: string) => Object.prototype.hasOwnProperty.call(values, key);
  if (!assessmentKeys.some(present)) return undefined;
  if (present("momentGradientFactor")) {
    throw new Error("momentGradientFactor is unsupported; use optional AISC-only aiscCb.");
  }
  if (input.codeProfile !== "AISC_360_22" && input.codeProfile !== "CSA_S16_19") {
    throw new Error("codeProfile must be AISC_360_22 or CSA_S16_19.");
  }
  if (input.unitSystem !== "metric" && input.unitSystem !== "imperial") {
    throw new Error("unitSystem must be metric or imperial.");
  }
  const metric = input.unitSystem === "metric";
  function entry(key: string, unit: string): unknown {
    const item = values as Record<string, unknown>;
    const value = item[key];
    if (!present(key) || !record(value) || value.unit !== unit) {
      throw new Error(`${key} is required with unit ${unit}.`);
    }
    return value.value;
  }
  function numeric(key: string, unit: string, factor = 1, zeroAllowed = false): number {
    const raw = entry(key, unit);
    if (typeof raw !== "number" && (typeof raw !== "string" ||
        !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()))) {
      throw new Error(`${key} must be a finite decimal number.`);
    }
    const value = Number(raw);
    const normalized = value * factor;
    if (!Number.isFinite(value) || !Number.isFinite(normalized) ||
        (zeroAllowed ? value < 0 || normalized < 0 : value <= 0 || normalized <= 0) ||
        (value > 0 && normalized === 0)) {
      throw new Error(`${key} must be finite and ${zeroAllowed ? "nonnegative" : "positive"} after conversion.`);
    }
    return normalized;
  }
  if (entry("supportModel", "category") !== "simply_supported_udl") {
    throw new Error("supportModel must be simply_supported_udl.");
  }
  const beamRestraint = entry("beamRestraint", "category");
  if (beamRestraint !== "verified" && beamRestraint !== "unknown") {
    throw new Error("beamRestraint must be verified or unknown.");
  }
  const lengthUnit = metric ? "mm" : "in";
  const lengthFactor = metric ? 1 : 25.4;
  const spanMm = numeric("span", lengthUnit, lengthFactor);
  const unbracedLengthMm = numeric("unbracedLength", lengthUnit, lengthFactor);
  if (unbracedLengthMm > spanMm) throw new Error("unbracedLength must not exceed span.");
  // 1 kN/m = 1 N/mm; international pound-force and foot definitions.
  const loadFactor = metric ? 1 : 4448.2216152605 / 304.8;
  const loadUnit = metric ? "kN/m" : "kip/ft";
  const serviceDeadLoadNPerMm = numeric("serviceDeadLoad", loadUnit, loadFactor, true);
  const serviceLiveLoadNPerMm = numeric("serviceLiveLoad", loadUnit, loadFactor, true);
  const totalLoad = serviceDeadLoadNPerMm + serviceLiveLoadNPerMm;
  if (!Number.isFinite(totalLoad) || totalLoad <= 0) {
    throw new Error("service load total must be finite and positive.");
  }
  const result: BeamAssessmentInput = {
    supportModel: "simply_supported_udl", beamRestraint, spanMm, unbracedLengthMm,
    serviceDeadLoadNPerMm, serviceLiveLoadNPerMm,
    liveDeflectionLimit: numeric("liveDeflectionLimit", "ratio"),
    totalDeflectionLimit: numeric("totalDeflectionLimit", "ratio"),
    materialYieldStrengthMPa: numeric("materialYieldStrength", metric ? "MPa" : "ksi",
      metric ? 1 : 6.894757293168361),
  };
  if (present("aiscCb")) {
    if (input.codeProfile !== "AISC_360_22") throw new Error("aiscCb is AISC-only.");
    const cb = numeric("aiscCb", "ratio");
    if (cb < 1 || cb > 3) throw new Error("aiscCb must be between 1 and 3 inclusive.");
    result.aiscCb = cb;
  }
  return result;
}
