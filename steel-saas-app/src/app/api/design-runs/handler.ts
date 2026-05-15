import type { CodeProfile } from "../../../domain/codeProfiles";
import type { DesignRunStatus } from "../../../domain/designRunStatus";
import type { UnitSystem } from "../../../domain/units";
import { EngineError } from "../../../engine/engineError";
import type { DesignRunRequest } from "./schema";

export type ProjectRow = {
  id: string;
  codeProfile: CodeProfile;
  unitSystem: UnitSystem;
};

export type FindProjectResult =
  | { found: false }
  | { found: true; belongsToOrg: boolean; project: ProjectRow };

export type DesignRunRow = {
  id: string;
  type: string;
  title: string;
  status: DesignRunStatus;
  inputJson: unknown;
  resultJson: unknown;
  errorCode: string | null;
};

export type HandlerDeps = {
  findProject: (projectId: string, organizationId: string) => Promise<FindProjectResult>;
  createDesignRun: (data: {
    projectId: string;
    createdByUserId: string;
    type: string;
    title: string;
    inputJson: unknown;
  }) => Promise<DesignRunRow>;
  updateDesignRun: (
    id: string,
    patch: { status: DesignRunStatus; resultJson?: unknown; errorCode?: string },
  ) => Promise<DesignRunRow>;
  runBeamEngine: (runId: string, project: ProjectRow, inputJson: unknown) => Promise<unknown>;
  runColumnEngine: (runId: string, project: ProjectRow, inputJson: unknown) => Promise<unknown>;
  runBasePlateEngine: (runId: string, project: ProjectRow, inputJson: unknown) => Promise<unknown>;
};

export type HandlerResult =
  | { ok: true; designRun: DesignRunRow }
  | { ok: false; httpStatus: 400 | 403 | 404 | 501; error: string; errorCode?: string };

export async function handleCreateDesignRun(
  body: DesignRunRequest,
  session: { userId: string; organizationId: string },
  deps: HandlerDeps,
): Promise<HandlerResult> {
  const projectResult = await deps.findProject(body.projectId, session.organizationId);
  if (!projectResult.found) {
    return { ok: false, httpStatus: 404, error: "Project not found." };
  }
  if (!projectResult.belongsToOrg) {
    return { ok: false, httpStatus: 403, error: "Project does not belong to your organization." };
  }

  const { project } = projectResult;

  let run = await deps.createDesignRun({
    projectId: body.projectId,
    createdByUserId: session.userId,
    type: body.type,
    title: body.title,
    inputJson: body.inputJson,
  });

  run = await deps.updateDesignRun(run.id, { status: "calculating" });

  try {
    const engineFn =
      body.type === "beam"
        ? deps.runBeamEngine
        : body.type === "column"
          ? deps.runColumnEngine
          : deps.runBasePlateEngine;
    const resultJson = await engineFn(run.id, project, body.inputJson);
    run = await deps.updateDesignRun(run.id, { status: "complete", resultJson });
  } catch (err) {
    const errorCode = err instanceof EngineError ? err.code : "ENGINE_ERROR";
    run = await deps.updateDesignRun(run.id, { status: "failed", errorCode });
  }

  return { ok: true, designRun: run };
}
