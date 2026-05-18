import { z } from "zod";

export const moduleTypeSchema = z.enum(["beam", "column", "base_plate"]);
export const codeProfileSchema = z.enum(["AISC_360_22", "CSA_S16_19"]);
export const unitSystemSchema = z.enum(["metric", "imperial"]);

export const displayValueSchema = z.object({
  label: z.string().min(1),
  value: z.union([z.number(), z.string()]),
  unit: z.string().min(1),
});

// Full section properties captured at calculation time so result_json is
// self-contained and reports never need to re-query the live section DB.
export const sectionSnapshotSchema = z.object({
  designation:      z.string(),
  A:                z.number(), // area (mm² or in²)
  d:                z.number(), // overall depth (mm or in)
  bf:               z.number(), // flange width (mm or in)
  tf:               z.number(), // flange thickness (mm or in)
  tw:               z.number(), // web thickness (mm or in)
  Sx:               z.number(), // elastic section modulus — strong axis (mm³ or in³)
  ry:               z.number(), // weak-axis radius of gyration (mm or in)
  Fy:               z.number(), // yield strength (MPa or ksi)
  sectionDbVersion: z.string(),
});

export type SectionSnapshot = z.infer<typeof sectionSnapshotSchema>;

export const designResultSchema = z.object({
  runId:                z.string().min(1),
  moduleType:           moduleTypeSchema,
  engineVersion:        z.string().min(1),
  sectionDbVersion:     z.string().min(1),
  codeProfile:          codeProfileSchema,
  unitSystem:           unitSystemSchema,
  demandMode:           z.literal("user_factored_demands"),
  displayInputSnapshot: z.record(displayValueSchema),
  normalizedInputs:     z.record(z.number()),
  displayResults:       z.record(z.union([z.string(), z.number(), z.boolean()])),
  calculationLines:     z.array(z.string()),
  warnings:             z.array(z.string()),
  codeReferences:       z.array(z.string()),
  // optional for backward-compat with runs stored before this field was added
  sectionSnapshot: sectionSnapshotSchema.optional(),
});

export type DesignResult = z.infer<typeof designResultSchema>;
