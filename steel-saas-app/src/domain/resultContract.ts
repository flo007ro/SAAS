import { z } from "zod";

export const moduleTypeSchema = z.enum(["beam", "column", "base_plate", "brace"]);
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
  rx:               z.number().optional(),
  ry:               z.number(), // weak-axis radius of gyration (mm or in)
  Fy:               z.number(), // yield strength (MPa or ksi)
  // Optional verified properties in the result's native mm/in unit system.
  Ix: z.number().finite().positive().optional(),
  Iy: z.number().finite().positive().optional(),
  Sy: z.number().finite().positive().optional(),
  Zx: z.number().finite().positive().optional(),
  J: z.number().finite().positive().optional(),
  Cw: z.number().finite().positive().optional(),
  rts: z.number().finite().positive().optional(),
  ho: z.number().finite().positive().optional(),
  kdes: z.number().finite().positive().optional(),
  hOverTw: z.number().finite().nonnegative().optional(),
  bfOver2tf: z.number().finite().nonnegative().optional(),
  E: z.number().finite().positive().optional(), // MPa or ksi
  sourceNote: z.string().optional(),
  propertySourceNote: z.string().optional(),
  sectionDbVersion: z.string(),
});

export type SectionSnapshot = z.infer<typeof sectionSnapshotSchema>;

export const beamCheckSchema = z.object({
  status: z.enum(["pass", "fail", "not_checked"]),
  summary: z.string().trim().min(1),
  ratio: z.number().finite().nonnegative().optional(),
}).refine(check => check.status !== "pass" || check.ratio === undefined || check.ratio <= 1, {
  message: "A passing check cannot have a demand/capacity ratio greater than one.",
  path: ["ratio"],
});

export const beamChecksSchema = z.object({
  flexure: beamCheckSchema,
  shear: beamCheckSchema,
  sectionClassification: beamCheckSchema,
  lateralTorsionalBuckling: beamCheckSchema,
  deflection: beamCheckSchema,
});

export type BeamChecks = z.infer<typeof beamChecksSchema>;

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
  beamChecks: beamChecksSchema.optional(),
});

export type DesignResult = z.infer<typeof designResultSchema>;
