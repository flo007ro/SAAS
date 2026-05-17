"use server";

import { redirect } from "next/navigation";
import { auth } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { enforceSubscription } from "../../../../../../lib/subscriptionGuard";
import {
  handleCreateDesignRun,
  type HandlerDeps,
  type FindProjectResult,
} from "../../../../../api/design-runs/handler";
import { designRunRequestSchema } from "../../../../../api/design-runs/schema";
import { runBeamEngine } from "../../../../../../engine/beamEngineRunner";
import { runColumnEngine } from "../../../../../../engine/columnEngineRunner";
import { runBasePlateEngine } from "../../../../../../engine/basePlateEngineRunner";
import type { CodeProfile } from "../../../../../../domain/codeProfiles";
import type { UnitSystem } from "../../../../../../domain/units";
import type { DesignRunStatus } from "../../../../../../domain/designRunStatus";

export type RunFormState = { error?: string } | null;

// Factored demand labels (engine validates these include "Factored")
const LABEL = {
  moment:      { metric: "Factored moment, M_f",      imperial: "Factored moment, M_u"      },
  shear:       { metric: "Factored shear, V_f",       imperial: "Factored shear, V_u"       },
  compression: { metric: "Factored compression, C_f", imperial: "Factored compression, P_u" },
} as const;

export async function createRunAction(
  _prev: RunFormState,
  formData: FormData,
): Promise<RunFormState> {
  const session = await auth();
  if (!session?.user?.userId) return { error: "Not authenticated." };

  const projectId  = formData.get("projectId")  as string;
  const type       = formData.get("type")        as string;
  const title      = formData.get("title")       as string;
  const unitSystem = formData.get("unitSystem")  as string;
  const codeProfile = formData.get("codeProfile") as string;

  const us = unitSystem as "metric" | "imperial";
  const num = (k: string) => parseFloat(formData.get(k) as string) || 0;
  const str = (k: string) => (formData.get(k) as string) ?? "";

  const momentUnit  = us === "metric" ? "kN-m" : "kip-ft";
  const forceUnit   = us === "metric" ? "kN"   : "kip";
  const lengthUnit  = us === "metric" ? "mm"   : "in";
  const pressUnit   = us === "metric" ? "MPa"  : "ksi";

  let displayValues: Record<string, { label: string; value: number | string; unit: string }>;

  if (type === "beam") {
    displayValues = {
      factoredMoment:  { label: LABEL.moment[us],      value: num("factoredMoment"),      unit: momentUnit },
      factoredShear:   { label: LABEL.shear[us],       value: num("factoredShear"),       unit: forceUnit  },
      selectedSection: { label: "Selected section",     value: str("selectedSection"),     unit: "designation" },
    };
  } else if (type === "column") {
    displayValues = {
      factoredCompression: { label: LABEL.compression[us], value: num("factoredCompression"), unit: forceUnit  },
      effectiveLength:     { label: "Effective length, KL", value: num("effectiveLength"),     unit: lengthUnit },
      selectedSection:     { label: "Selected section",     value: str("selectedSection"),     unit: "designation" },
    };
  } else if (type === "base_plate") {
    displayValues = {
      factoredCompression: { label: LABEL.compression[us],       value: num("factoredCompression"), unit: forceUnit  },
      plateN:              { label: "Plate dimension N",          value: num("plateN"),              unit: lengthUnit },
      plateB:              { label: "Plate dimension B",          value: num("plateB"),              unit: lengthUnit },
      concreteStrength:    { label: "Concrete strength, f’c", value: num("concreteStrength"),   unit: pressUnit  },
      plateFy:             { label: "Plate yield strength, F_y",  value: num("plateFy"),             unit: pressUnit  },
      selectedSection:     { label: "Column section",             value: str("selectedSection"),     unit: "designation" },
    };
  } else {
    return { error: "Invalid run type." };
  }

  const parsed = designRunRequestSchema.safeParse({
    type, projectId, title,
    inputJson: { unitSystem, codeProfile, displayValues },
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = await (prisma as any).organization.findUnique({
    where: { id: session.user.organizationId },
    select: { subscriptionStatus: true },
  });
  const sub = enforceSubscription(org?.subscriptionStatus);
  if (!sub.allowed) return { error: sub.message };

  const SELECT = { id: true, type: true, title: true, status: true, inputJson: true, resultJson: true, errorCode: true };

  const deps: HandlerDeps = {
    findProject: async (pid, orgId): Promise<FindProjectResult> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = await (prisma as any).project.findUnique({ where: { id: pid } });
      if (!row) return { found: false };
      return {
        found: true,
        belongsToOrg: row.organizationId === orgId,
        project: { id: row.id, codeProfile: row.codeProfile as CodeProfile, unitSystem: row.unitSystem as UnitSystem },
      };
    },
    createDesignRun: async (data) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).designRun.create({
        data: { ...data, status: "draft" satisfies DesignRunStatus },
        select: SELECT,
      }),
    updateDesignRun: async (id, patch) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).designRun.update({ where: { id }, data: patch, select: SELECT }),
    runBeamEngine:     async (id, p, ij) => runBeamEngine(id, p, ij),
    runColumnEngine:   async (id, p, ij) => runColumnEngine(id, p, ij),
    runBasePlateEngine: async (id, p, ij) => runBasePlateEngine(id, p, ij),
  };

  const result = await handleCreateDesignRun(
    parsed.data,
    { userId: session.user.userId, organizationId: session.user.organizationId },
    deps,
  );

  if (!result.ok) return { error: result.error };
  const run = result.designRun as { id: string };
  redirect(`/projects/${projectId}/runs/${run.id}`);
}
