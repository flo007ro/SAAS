import type { CodeProfile } from "../domain/codeProfiles";
import type { EngineeringUnit, UnitSystem } from "../domain/units";
import { validateRunInput } from "./runInputValidation";
import type { DesignRunRequest } from "../app/api/design-runs/schema";
import { calculateColumnDesign } from "./columnDesign";
import { EngineError } from "./engineError";

type DisplayValue = { label: string; value: string | number; unit: string };

export function runColumnEngine(
  runId: string,
  project: { codeProfile: CodeProfile; unitSystem: UnitSystem },
  inputJson: unknown,
) {
  const input = inputJson as {
    displayValues: Record<string, DisplayValue | undefined>;
  };

  const { factoredCompression, effectiveLength, selectedSection } = input.displayValues ?? {};

  if (!factoredCompression || typeof factoredCompression.value !== "number") {
    throw new EngineError("MISSING_INPUTS", "factoredCompression is required with a numeric value");
  }
  if (!effectiveLength || typeof effectiveLength.value !== "number") {
    throw new EngineError("MISSING_INPUTS", "effectiveLength is required with a numeric value");
  }
  if (!selectedSection || typeof selectedSection.value !== "string") {
    throw new EngineError("MISSING_INPUTS", "selectedSection designation is required");
  }

  const section = validateRunInput("column", project, inputJson as DesignRunRequest["inputJson"]);

  return calculateColumnDesign({
    runId,
    codeProfile: project.codeProfile,
    unitSystem: project.unitSystem,
    section,
    factoredCompression: {
      label: factoredCompression.label,
      value: factoredCompression.value,
      unit: factoredCompression.unit as EngineeringUnit,
    },
    effectiveLength: {
      label: effectiveLength.label,
      value: effectiveLength.value,
      unit: effectiveLength.unit as EngineeringUnit,
    },
  });
}
