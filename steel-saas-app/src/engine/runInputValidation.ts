import type { DesignRunRequest } from "../app/api/design-runs/schema";
import { runFields, allowsZeroDemand } from "../domain/runForm";
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
    if (!entry || typeof entry.value !== "number" || !Number.isFinite(entry.value) || entry.value < 0 || (entry.value === 0 && !allowsZeroDemand(type, field.key))) {
      throw new EngineError("INVALID_INPUT", `${field.label} must be a finite number ${allowsZeroDemand(type, field.key) ? "zero or greater" : "greater than zero"}.`);
    }
    if (entry.unit !== field.unit) throw new EngineError("UNIT_MISMATCH", `${field.label} must use ${field.unit}.`);
    if (field.key.startsWith("factored") && !entry.label.includes("Factored")) {
      throw new EngineError("INVALID_INPUT", `${field.label} must be identified as Factored.`);
    }
  }
  if (type === "brace") {
    const v = input.displayValues;
    if (Number(v.factoredTension.value) === 0 && Number(v.factoredCompression.value) === 0) throw new EngineError("INVALID_INPUT", "At least one factored brace demand must be greater than zero.");
    if (Number(v.netArea.value) > section.area) throw new EngineError("INVALID_INPUT", "Net area cannot exceed the section's gross area.");
    if (Number(v.shearLagFactor.value) > 1) throw new EngineError("INVALID_INPUT", "Shear-lag factor must be greater than zero and at most 1.");
    if (Number(v.ultimateStrength.value) < section.fy) throw new EngineError("INVALID_INPUT", "Ultimate strength Fu cannot be lower than reference yield strength Fy.");
    if (![section.rx, section.ry].every(n => Number.isFinite(n) && n > 0)) throw new EngineError("INVALID_SECTION", "Brace calculations require positive radii of gyration about both axes.");
    if (!["ordinary", "seismic"].includes(String(v.seismicDemand?.value))) throw new EngineError("INVALID_INPUT", "Select ordinary or seismic brace demand.");
  }
  if (type === "base_plate" && (Number(input.displayValues.plateN.value) < section.depth ||
    Number(input.displayValues.plateB.value) < section.flangeWidth)) {
    throw new EngineError("INVALID_GEOMETRY", "Plate N must cover the column depth and plate B must cover the flange width.");
  }
  return section;
}
