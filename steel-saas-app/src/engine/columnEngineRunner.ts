import type { CodeProfile } from "../domain/codeProfiles";
import type { EngineeringUnit, UnitSystem } from "../domain/units";
import { sectionSeedV1 } from "../domain/sections/sectionSeed.v1";
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

  const section = sectionSeedV1.find((s) => s.designation === selectedSection.value);
  if (!section) {
    throw new EngineError(
      "SECTION_NOT_FOUND",
      `Section "${selectedSection.value}" not found in database`,
    );
  }

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
