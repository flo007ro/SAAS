import type { EngineeringUnit } from "./units";

export type FactoredDemandInput = {
  key: string;
  label: string;
  value: number;
  unit: EngineeringUnit;
};

export type DemandValidationResult = {
  ok: boolean;
  errors: string[];
};

export function validateFactoredDemandInput(
  input: FactoredDemandInput,
): DemandValidationResult {
  const errors: string[] = [];

  if (!input.label.includes("Factored")) {
    errors.push("Demand label must visibly include 'Factored'.");
  }

  if (!Number.isFinite(input.value)) {
    errors.push("Demand value must be a finite number.");
  } else if (input.value <= 0) {
    errors.push("Demand value must be greater than zero.");
  }

  if (!input.unit) {
    errors.push("Demand input must include a unit.");
  }

  return { ok: errors.length === 0, errors };
}
