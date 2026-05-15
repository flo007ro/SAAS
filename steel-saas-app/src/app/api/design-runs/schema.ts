import { z } from "zod";
import { codeProfileSchema, unitSystemSchema } from "../../../domain/resultContract";

const displayValueSchema = z.object({
  label: z.string().min(1),
  value: z.union([z.number(), z.string().min(1)]),
  unit: z.string().min(1),
});

export const designRunRequestSchema = z.object({
  type: z.enum(["beam", "column", "base_plate"]),
  projectId: z.string().min(1),
  title: z.string().min(1),
  inputJson: z.object({
    unitSystem: unitSystemSchema,
    codeProfile: codeProfileSchema,
    displayValues: z.record(displayValueSchema),
  }),
});

export type DesignRunRequest = z.infer<typeof designRunRequestSchema>;
