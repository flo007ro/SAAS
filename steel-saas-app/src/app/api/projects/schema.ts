import { z } from "zod";
import { codeProfileSchema, unitSystemSchema } from "../../../domain/resultContract";

export const createProjectSchema = z.object({
  name: z.string().min(1),
  client: z.string().min(1),
  location: z.string().min(1),
  codeProfile: codeProfileSchema,
  unitSystem: unitSystemSchema,
});

export const patchProjectSchema = z
  .object({
    name: z.string().min(1).optional(),
    client: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    codeProfile: codeProfileSchema.optional(),
    unitSystem: unitSystemSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type PatchProjectInput = z.infer<typeof patchProjectSchema>;
