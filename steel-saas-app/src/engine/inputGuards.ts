import type { SteelSection } from "../domain/sections/sectionTypes";
import type { UnitSystem, UnitValue } from "../domain/units";
import { EngineError } from "./engineError";

export function assertCalculationInputs(units: UnitSystem, section: SteelSection,
  values: Array<[string, UnitValue, string]>) {
  if (section.unitSystem !== units) throw new EngineError("UNIT_MISMATCH", "Section properties and calculation units must match.");
  for (const key of ["area", "depth", "flangeWidth", "webThickness", "flangeThickness", "sx", "ry", "fy"] as const) {
    if (!Number.isFinite(section[key]) || section[key] <= 0) throw new EngineError("INVALID_SECTION", `Section ${key} must be positive and finite.`);
  }
  if (section.depth <= 2 * section.flangeThickness) throw new EngineError("INVALID_SECTION", "Section has no clear web depth.");
  for (const [label, value, expectedUnit] of values) {
    if (!Number.isFinite(value.value) || value.value <= 0) throw new EngineError("INVALID_INPUT", `${label} must be positive and finite.`);
    if (value.unit !== expectedUnit) throw new EngineError("UNIT_MISMATCH", `${label} must use ${expectedUnit}.`);
  }
}

// Finite source numbers can still overflow during division/multiplication.
export function ensureFiniteResult<T>(result: T): T {
  function visit(value: unknown): void {
    if (typeof value === "number" && !Number.isFinite(value)) throw new EngineError("NUMERIC_RANGE", "Inputs exceed the calculation's numeric range.");
    if (value && typeof value === "object") Object.values(value).forEach(visit);
  }
  visit(result);
  return result;
}
