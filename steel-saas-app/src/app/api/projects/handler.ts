import { enforceSubscription } from "../../../lib/subscriptionGuard";
import { createProjectSchema, patchProjectSchema } from "./schema";
import type { CreateProjectInput, PatchProjectInput } from "./schema";

export type ProjectRow = {
  id: string;
  organizationId: string;
  name: string;
  client: string;
  location: string;
  codeProfile: string;
  unitSystem: string;
  createdAt: Date | string;
  archivedAt: Date | string | null;
};

export type ProjectHandlerDeps = {
  subscriptionStatus: string | null;
  createProject: (data: CreateProjectInput & { organizationId: string }) => Promise<ProjectRow>;
  listProjects: (organizationId: string) => Promise<ProjectRow[]>;
  findProject: (id: string, organizationId: string) => Promise<ProjectRow | null>;
  patchProject: (id: string, organizationId: string, data: PatchProjectInput) => Promise<ProjectRow | null>;
  archiveProject: (id: string, organizationId: string) => Promise<ProjectRow | null>;
};

type Session = { userId: string; organizationId: string };

export type ProjectHandlerResult =
  | { ok: true; data: unknown; httpStatus: 200 | 201 }
  | { ok: false; httpStatus: 400 | 402 | 404; error: string; issues?: unknown };

// ── shared guard ──────────────────────────────────────────────────────────────

function checkSub(status: string | null): ProjectHandlerResult | null {
  const r = enforceSubscription(status);
  if (!r.allowed) return { ok: false, httpStatus: r.httpStatus, error: r.message };
  return null;
}

// ── handlers ──────────────────────────────────────────────────────────────────

export async function handleCreateProject(
  body: unknown,
  session: Session,
  deps: ProjectHandlerDeps,
): Promise<ProjectHandlerResult> {
  const blocked = checkSub(deps.subscriptionStatus);
  if (blocked) return blocked;

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, httpStatus: 400, error: "Invalid request body.", issues: parsed.error.issues };
  }

  const project = await deps.createProject({ ...parsed.data, organizationId: session.organizationId });
  return { ok: true, data: project, httpStatus: 201 };
}

export async function handleListProjects(
  session: Session,
  deps: ProjectHandlerDeps,
): Promise<ProjectHandlerResult> {
  const blocked = checkSub(deps.subscriptionStatus);
  if (blocked) return blocked;

  const projects = await deps.listProjects(session.organizationId);
  return { ok: true, data: projects, httpStatus: 200 };
}

export async function handleGetProject(
  id: string,
  session: Session,
  deps: ProjectHandlerDeps,
): Promise<ProjectHandlerResult> {
  const blocked = checkSub(deps.subscriptionStatus);
  if (blocked) return blocked;

  const project = await deps.findProject(id, session.organizationId);
  if (!project) return { ok: false, httpStatus: 404, error: "Project not found." };
  return { ok: true, data: project, httpStatus: 200 };
}

export async function handlePatchProject(
  id: string,
  body: unknown,
  session: Session,
  deps: ProjectHandlerDeps,
): Promise<ProjectHandlerResult> {
  const blocked = checkSub(deps.subscriptionStatus);
  if (blocked) return blocked;

  const parsed = patchProjectSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, httpStatus: 400, error: "Invalid request body.", issues: parsed.error.issues };
  }

  const project = await deps.patchProject(id, session.organizationId, parsed.data);
  if (!project) return { ok: false, httpStatus: 404, error: "Project not found." };
  return { ok: true, data: project, httpStatus: 200 };
}

export async function handleDeleteProject(
  id: string,
  session: Session,
  deps: ProjectHandlerDeps,
): Promise<ProjectHandlerResult> {
  const blocked = checkSub(deps.subscriptionStatus);
  if (blocked) return blocked;

  const project = await deps.archiveProject(id, session.organizationId);
  if (!project) return { ok: false, httpStatus: 404, error: "Project not found." };
  return { ok: true, data: project, httpStatus: 200 };
}
