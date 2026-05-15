import { z } from "zod";

export const moduleTypeSchema = z.enum(["beam", "column", "base_plate"]);
export const codeProfileSchema = z.enum(["AISC_360_22", "CSA_S16_19"]);
export const unitSystemSchema = z.enum(["metric", "imperial"]);

export const displayValueSchema = z.object({
  label: z.string().min(1),
  value: z.union([z.number(), z.string()]),
  unit: z.string().min(1),
});

export const designResultSchema = z.object({
  runId: z.string().min(1),
  moduleType: moduleTypeSchema,
  engineVersion: z.string().min(1),
  sectionDbVersion: z.string().min(1),
  codeProfile: codeProfileSchema,
  unitSystem: unitSystemSchema,
  demandMode: z.literal("user_factored_demands"),
  displayInputSnapshot: z.record(displayValueSchema),
  normalizedInputs: z.record(z.number()),
  displayResults: z.record(z.union([z.string(), z.number(), z.boolean()])),
  calculationLines: z.array(z.string()),
  warnings: z.array(z.string()),
  codeReferences: z.array(z.string()),
});

export type DesignResult = z.infer<typeof designResultSchema>;
