import type { CodeProfile } from "../domain/codeProfiles";
import type { EngineeringUnit, UnitSystem } from "../domain/units";
import { sectionSeedV1 } from "../domain/sections/sectionSeed.v1";
import { calculateBeamDesign } from "./beamDesign";
import { EngineError } from "./engineError";

type DisplayValue = { label: string; value: string | number; unit: string };

export function runBeamEngine(
  runId: string,
  project: { codeProfile: CodeProfile; unitSystem: UnitSystem },
  inputJson: unknown,
) {
  const input = inputJson as {
    displayValues: Record<string, DisplayValue | undefined>;
  };

  const { factoredMoment, factoredShear, selectedSection } = input.displayValues ?? {};

  if (!factoredMoment || typeof factoredMoment.value !== "number") {
    throw new EngineError("MISSING_INPUTS", "factoredMoment is required with a numeric value");
  }
  if (!factoredShear || typeof factoredShear.value !== "number") {
    throw new EngineError("MISSING_INPUTS", "factoredShear is required with a numeric value");
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

  return calculateBeamDesign({
    runId,
    codeProfile: project.codeProfile,
    unitSystem: project.unitSystem,
    section,
    factoredMoment: {
      label: factoredMoment.label,
      value: factoredMoment.value,
      unit: factoredMoment.unit as EngineeringUnit,
    },
    factoredShear: {
      label: factoredShear.label,
      value: factoredShear.value,
      unit: factoredShear.unit as EngineeringUnit,
    },
  });
}
