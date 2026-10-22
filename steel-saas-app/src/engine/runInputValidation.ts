import type { DesignRunRequest } from "../app/api/design-runs/schema";
import { runFields } from "../domain/runForm";
import { sectionSeedV1 } from "../domain/sections/sectionSeed.v1";
import { EngineError } from "./engineError";
import type { CodeProfile } from "../domain/codeProfiles";
import type { UnitSystem } from "../domain/units";

export function validateRunInput(type: DesignRunRequest["type"],
  project: { codeProfile: CodeProfile; unitSystem: UnitSystem }, input: DesignRunRequest["inputJson"]) {
  if (input.unitSystem !== project.unitSystem || input.codeProfile !== project.codeProfile) {
    throw new EngineError("PROJECT_CONTEXT_MISMATCH", "Code and units must match the project. Reload the form to use its current settings.");
  }
  const selected = input.displayValues?.selectedSection;
  const section = sectionSeedV1.find(s => s.designation === selected?.value &&
    s.unitSystem === project.unitSystem && s.standard === project.codeProfile);
  if (!section) throw new EngineError("SECTION_NOT_FOUND", "Select a reference section compatible with the project's code and units. Available data supports CSA metric and AISC imperial.");
  for (const field of runFields(type, project.unitSystem)) {
    const entry = input.displayValues[field.key];
    if (!entry || typeof entry.value !== "number" || !Number.isFinite(entry.value) || entry.value <= 0) {
      throw new EngineError("INVALID_INPUT", `${field.label} must be a finite number greater than zero.`);
    }
    if (entry.unit !== field.unit) throw new EngineError("UNIT_MISMATCH", `${field.label} must use ${field.unit}.`);
    if (field.key.startsWith("factored") && !entry.label.includes("Factored")) {
      throw new EngineError("INVALID_INPUT", `${field.label} must be identified as Factored.`);
    }
  }
  if (type === "base_plate" && (Number(input.displayValues.plateN.value) < section.depth ||
    Number(input.displayValues.plateB.value) < section.flangeWidth)) {
    throw new EngineError("INVALID_GEOMETRY", "Plate N must cover the column depth and plate B must cover the flange width.");
  }
  return section;
}
