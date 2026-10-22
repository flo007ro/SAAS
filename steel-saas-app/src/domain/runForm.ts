import { z } from "zod";
import type { CodeProfile } from "./codeProfiles";
import type { UnitSystem } from "./units";

export type RunType = "beam" | "column" | "base_plate" | "brace";
export function allowsZeroDemand(type: RunType, field: string) {
  return type === "brace" && ["factoredTension", "factoredCompression"].includes(field);
}
export const sectionOptionSchema = z.object({
  designation: z.string().min(1), standard: z.enum(["AISC_360_22", "CSA_S16_19"]),
  unitSystem: z.enum(["metric", "imperial"]),
});
export type SectionOption = z.infer<typeof sectionOptionSchema>;
export function parseSectionOptions(data: unknown, code: CodeProfile, units: UnitSystem) {
  return z.array(sectionOptionSchema).parse(data)
    .filter(s => s.standard === code && s.unitSystem === units);
}

export function runFields(type: RunType, units: UnitSystem) {
  const metric = units === "metric";
  const force = metric ? "kN" : "kip";
  const length = metric ? "mm" : "in";
  const stress = metric ? "MPa" : "ksi";
  const compression = { key: "factoredCompression", label: "Factored axial compression", unit: force };
  if (type === "beam") return [
    { key: "factoredMoment", label: "Factored major-axis moment", unit: metric ? "kN-m" : "kip-ft" },
    { key: "factoredShear", label: "Factored shear", unit: force },
  ];
  if (type === "column") return [compression,
    { key: "effectiveLength", label: "Effective buckling length, KL (weak axis)", unit: length },
  ];
  if (type === "brace") return [
    { key: "factoredTension", label: "Factored axial tension", unit: force }, compression,
    { key: "memberLength", label: "Unbraced member length, L", unit: length },
    { key: "effectiveLengthX", label: "Strong-axis effective length, Kx Lx", unit: length },
    { key: "effectiveLengthY", label: "Weak-axis effective length, Ky Ly", unit: length },
    { key: "netArea", label: "Net area after holes, An (engineer supplied)", unit: metric ? "mm²" : "in²" },
    { key: "shearLagFactor", label: "Shear-lag factor, U (engineer supplied)", unit: "ratio" },
    { key: "ultimateStrength", label: "Steel ultimate strength, Fu (material certificate)", unit: stress },
    { key: "tensionSlendernessLimit", label: "Tension L/r screening threshold (project criterion)", unit: "ratio" },
    { key: "compressionSlendernessLimit", label: "Compression KL/r screening threshold (project criterion)", unit: "ratio" },
  ];
  return [compression,
    { key: "plateN", label: "Plate length N (along column depth)", unit: length },
    { key: "plateB", label: "Plate width B (along flange width)", unit: length },
    { key: "concreteStrength", label: "Concrete compressive strength, f'c", unit: stress },
    { key: "plateFy", label: "Plate yield strength, Fy", unit: stress },
  ];
}

export function buildRunInput(type: RunType, unitSystem: UnitSystem, codeProfile: CodeProfile,
  fields: Record<string, string>, section: string) {
  const displayValues: Record<string, { label: string; value: number | string; unit: string }> = {
    selectedSection: { label: "Selected section", value: section, unit: "designation" },
  };
  for (const field of runFields(type, unitSystem)) {
    const raw = fields[field.key]?.trim();
    const value = raw ? Number(raw) : NaN;
    if (!Number.isFinite(value) || value < 0 || (value === 0 && !allowsZeroDemand(type, field.key))) throw new Error(`${field.label} must be a finite number ${allowsZeroDemand(type, field.key) ? "zero or greater" : "greater than zero"}.`);
    displayValues[field.key] = { label: field.label, value, unit: field.unit };
  }
  return { unitSystem, codeProfile, displayValues };
}
