import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { enforceSubscription } from "../../../lib/subscriptionGuard";
import { runBeamEngine } from "../../../engine/beamEngineRunner";
import { runColumnEngine } from "../../../engine/columnEngineRunner";
import { runBasePlateEngine } from "../../../engine/basePlateEngineRunner";
import type { CodeProfile } from "../../../domain/codeProfiles";
import type { UnitSystem } from "../../../domain/units";
import type { DesignRunStatus } from "../../../domain/designRunStatus";
import { designRunRequestSchema } from "./schema";
import { handleCreateDesignRun, type FindProjectResult } from "./handler";


export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { subscriptionStatus: true },
  });
  const enforcement = enforceSubscription(org?.subscriptionStatus);
  if (!enforcement.allowed) {
    return NextResponse.json({ error: enforcement.message }, { status: enforcement.httpStatus });
  }

  const body = await req.json().catch(() => null);
  const parsed = designRunRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await handleCreateDesignRun(
    parsed.data,
    { userId: session.user.userId, organizationId: session.user.organizationId },
    {
      findProject: async (projectId, organizationId): Promise<FindProjectResult> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = await (prisma as any).project.findUnique({ where: { id: projectId } });
        if (!row) return { found: false };
        return {
          found: true,
          belongsToOrg: row.organizationId === organizationId,
          project: { id: row.id, codeProfile: row.codeProfile as CodeProfile, unitSystem: row.unitSystem as UnitSystem },
        };
      },

      createDesignRun: async (data) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any).designRun.create({
          data: {
            projectId: data.projectId,
            createdByUserId: data.createdByUserId,
            type: data.type,
            title: data.title,
            inputJson: data.inputJson as object,
            status: "draft" satisfies DesignRunStatus,
          },
          select: { id: true, type: true, title: true, status: true, inputJson: true, resultJson: true, errorCode: true },
        }),

      updateDesignRun: async (id, patch) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prisma as any).designRun.update({
          where: { id },
          data: {
            status: patch.status,
            ...(patch.resultJson !== undefined && { resultJson: patch.resultJson as object }),
            ...(patch.errorCode !== undefined && { errorCode: patch.errorCode }),
          },
          select: { id: true, type: true, title: true, status: true, inputJson: true, resultJson: true, errorCode: true },
        }),

      runBeamEngine: async (runId, project, inputJson) =>
        runBeamEngine(runId, project, inputJson),

      runColumnEngine: async (runId, project, inputJson) =>
        runColumnEngine(runId, project, inputJson),

      runBasePlateEngine: async (runId, project, inputJson) =>
        runBasePlateEngine(runId, project, inputJson),
    },
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.errorCode && { errorCode: result.errorCode }) },
      { status: result.httpStatus },
    );
  }

  return NextResponse.json(result.designRun);
}
