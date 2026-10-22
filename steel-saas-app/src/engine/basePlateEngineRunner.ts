import type { CodeProfile } from "../domain/codeProfiles";
import type { EngineeringUnit, UnitSystem } from "../domain/units";
import { validateRunInput } from "./runInputValidation";
import type { DesignRunRequest } from "../app/api/design-runs/schema";
import { calculateBasePlateDesign } from "./basePlateDesign";
import { EngineError } from "./engineError";

type DisplayValue = { label: string; value: string | number; unit: string };

export function runBasePlateEngine(
  runId: string,
  project: { codeProfile: CodeProfile; unitSystem: UnitSystem },
  inputJson: unknown,
) {
  const input = inputJson as {
    displayValues: Record<string, DisplayValue | undefined>;
  };

  const { factoredCompression, plateN, plateB, concreteStrength, plateFy, selectedSection } =
    input.displayValues ?? {};

  if (!factoredCompression || typeof factoredCompression.value !== "number") {
    throw new EngineError("MISSING_INPUTS", "factoredCompression is required with a numeric value");
  }
  if (!plateN || typeof plateN.value !== "number") {
    throw new EngineError("MISSING_INPUTS", "plateN is required with a numeric value");
  }
  if (!plateB || typeof plateB.value !== "number") {
    throw new EngineError("MISSING_INPUTS", "plateB is required with a numeric value");
  }
  if (!concreteStrength || typeof concreteStrength.value !== "number") {
    throw new EngineError("MISSING_INPUTS", "concreteStrength is required with a numeric value");
  }
  if (!plateFy || typeof plateFy.value !== "number") {
    throw new EngineError("MISSING_INPUTS", "plateFy is required with a numeric value");
  }
  if (!selectedSection || typeof selectedSection.value !== "string") {
    throw new EngineError("MISSING_INPUTS", "selectedSection designation is required");
  }

  const section = validateRunInput("base_plate", project, inputJson as DesignRunRequest["inputJson"]);

  return calculateBasePlateDesign({
    runId,
    codeProfile: project.codeProfile,
    unitSystem: project.unitSystem,
    section,
    factoredCompression: {
      label: factoredCompression.label,
      value: factoredCompression.value,
      unit: factoredCompression.unit as EngineeringUnit,
    },
    plateN: {
      label: plateN.label,
      value: plateN.value,
      unit: plateN.unit as EngineeringUnit,
    },
    plateB: {
      label: plateB.label,
      value: plateB.value,
      unit: plateB.unit as EngineeringUnit,
    },
    concreteStrength: {
      label: concreteStrength.label,
      value: concreteStrength.value,
      unit: concreteStrength.unit as EngineeringUnit,
    },
    plateFy: {
      label: plateFy.label,
      value: plateFy.value,
      unit: plateFy.unit as EngineeringUnit,
    },
  });
}
