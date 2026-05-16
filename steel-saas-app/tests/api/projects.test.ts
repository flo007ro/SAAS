import { describe, expect, it } from "vitest";
import {
  handleCreateProject,
  handleListProjects,
  handleGetProject,
  handlePatchProject,
  handleDeleteProject,
  type ProjectHandlerDeps,
  type ProjectRow,
} from "../../src/app/api/projects/handler";
import {
  createProjectSchema,
  patchProjectSchema,
} from "../../src/app/api/projects/schema";

// ── fixtures ──────────────────────────────────────────────────────────────────

const fakeSession = { userId: "user_1", organizationId: "org_1" };

const fakeProject: ProjectRow = {
  id: "proj_1",
  organizationId: "org_1",
  name: "Bridge Retrofit",
  client: "City of Testville",
  location: "Testville, ON",
  codeProfile: "CSA_S16_19",
  unitSystem: "metric",
  createdAt: new Date("2026-05-01"),
  archivedAt: null,
};

const validCreateBody = {
  name: "Bridge Retrofit",
  client: "City of Testville",
  location: "Testville, ON",
  codeProfile: "CSA_S16_19",
  unitSystem: "metric",
};

function makeDeps(overrides: Partial<ProjectHandlerDeps> = {}): ProjectHandlerDeps {
  return {
    subscriptionStatus: "active",
    createProject: async () => fakeProject,
    listProjects: async () => [fakeProject],
    findProject: async () => fakeProject,
    patchProject: async () => fakeProject,
    archiveProject: async () => ({ ...fakeProject, archivedAt: new Date("2026-05-15") }),
    ...overrides,
  };
}

// ── schema: createProjectSchema ───────────────────────────────────────────────

describe("createProjectSchema", () => {
  it("accepts a valid payload", () => {
    expect(createProjectSchema.safeParse(validCreateBody).success).toBe(true);
  });

  it("rejects missing name", () => {
    const { name: _, ...rest } = validCreateBody;
    expect(createProjectSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid codeProfile", () => {
    expect(
      createProjectSchema.safeParse({ ...validCreateBody, codeProfile: "INVALID" }).success,
    ).toBe(false);
  });

  it("rejects invalid unitSystem", () => {
    expect(
      createProjectSchema.safeParse({ ...validCreateBody, unitSystem: "SI" }).success,
    ).toBe(false);
  });
});

// ── schema: patchProjectSchema ────────────────────────────────────────────────

describe("patchProjectSchema", () => {
  it("accepts a partial update", () => {
    expect(patchProjectSchema.safeParse({ name: "New Name" }).success).toBe(true);
  });

  it("rejects an empty patch body", () => {
    expect(patchProjectSchema.safeParse({}).success).toBe(false);
  });

  it("does not expose archivedAt as a patchable field", () => {
    const parsed = patchProjectSchema.safeParse({
      name: "New Name",
      archivedAt: "2026-01-01",
    });
    // Zod strips unknown keys — archivedAt is absent from the parsed output
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("archivedAt" in parsed.data).toBe(false);
    }
  });
});

// ── subscription enforcement (all five handlers) ──────────────────────────────

describe("subscription enforcement", () => {
  const inactive = makeDeps({ subscriptionStatus: null });

  it("POST /api/projects → 402 when subscription inactive", async () => {
    const result = await handleCreateProject(validCreateBody, fakeSession, inactive);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(402);
  });

  it("GET /api/projects → 402 when subscription inactive", async () => {
    const result = await handleListProjects(fakeSession, inactive);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(402);
  });

  it("GET /api/projects/[id] → 402 when subscription inactive", async () => {
    const result = await handleGetProject("proj_1", fakeSession, inactive);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(402);
  });

  it("PATCH /api/projects/[id] → 402 when subscription inactive", async () => {
    const result = await handlePatchProject("proj_1", { name: "x" }, fakeSession, inactive);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(402);
  });

  it("DELETE /api/projects/[id] → 402 when subscription inactive", async () => {
    const result = await handleDeleteProject("proj_1", fakeSession, inactive);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(402);
  });
});

// ── handleCreateProject ───────────────────────────────────────────────────────

describe("handleCreateProject", () => {
  it("returns 400 for an invalid body", async () => {
    const result = await handleCreateProject({ name: "" }, fakeSession, makeDeps());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(400);
  });

  it("creates and returns the project with 201", async () => {
    const captured: object[] = [];
    const result = await handleCreateProject(
      validCreateBody,
      fakeSession,
      makeDeps({
        createProject: async (data) => {
          captured.push(data);
          return fakeProject;
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.httpStatus).toBe(201);
      expect(result.data).toEqual(fakeProject);
    }
    expect((captured[0] as { organizationId: string }).organizationId).toBe("org_1");
  });
});

// ── handleListProjects ────────────────────────────────────────────────────────

describe("handleListProjects", () => {
  it("queries only the session org's projects", async () => {
    const capturedOrgIds: string[] = [];
    await handleListProjects(
      fakeSession,
      makeDeps({ listProjects: async (orgId) => { capturedOrgIds.push(orgId); return []; } }),
    );
    expect(capturedOrgIds).toEqual(["org_1"]);
  });

  it("returns the project list", async () => {
    const result = await handleListProjects(fakeSession, makeDeps());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([fakeProject]);
  });
});

// ── handleGetProject ──────────────────────────────────────────────────────────

describe("handleGetProject", () => {
  it("returns 404 when findProject returns null (another org or missing)", async () => {
    const result = await handleGetProject(
      "proj_other",
      fakeSession,
      makeDeps({ findProject: async () => null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(404);
  });

  it("returns the project when it belongs to the session org", async () => {
    const result = await handleGetProject("proj_1", fakeSession, makeDeps());
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.data as ProjectRow).id).toBe("proj_1");
  });
});

// ── handlePatchProject ────────────────────────────────────────────────────────

describe("handlePatchProject", () => {
  it("returns 404 for a project that does not belong to the session org", async () => {
    const result = await handlePatchProject(
      "proj_other",
      { name: "New Name" },
      fakeSession,
      makeDeps({ patchProject: async () => null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(404);
  });

  it("returns 400 for an empty patch", async () => {
    const result = await handlePatchProject("proj_1", {}, fakeSession, makeDeps());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(400);
  });

  it("passes only schema-allowed fields to the db dep", async () => {
    const captured: object[] = [];
    await handlePatchProject(
      "proj_1",
      { name: "Updated", archivedAt: "2026-01-01" } as object,
      fakeSession,
      makeDeps({
        patchProject: async (_id, _orgId, data) => { captured.push(data); return fakeProject; },
      }),
    );
    const patch = captured[0] as Record<string, unknown>;
    expect(patch.name).toBe("Updated");
    expect("archivedAt" in patch).toBe(false);
  });

  it("returns the updated project", async () => {
    const updated = { ...fakeProject, name: "Updated Name" };
    const result = await handlePatchProject(
      "proj_1",
      { name: "Updated Name" },
      fakeSession,
      makeDeps({ patchProject: async () => updated }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.data as ProjectRow).name).toBe("Updated Name");
  });
});

// ── handleDeleteProject ───────────────────────────────────────────────────────

describe("handleDeleteProject", () => {
  it("returns 404 for a project that does not belong to the session org", async () => {
    const result = await handleDeleteProject(
      "proj_other",
      fakeSession,
      makeDeps({ archiveProject: async () => null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(404);
  });

  it("sets archivedAt and returns the archived project", async () => {
    const archived = { ...fakeProject, archivedAt: new Date("2026-05-15") };
    const result = await handleDeleteProject(
      "proj_1",
      fakeSession,
      makeDeps({ archiveProject: async () => archived }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const row = result.data as ProjectRow;
      expect(row.archivedAt).not.toBeNull();
    }
  });

  it("archived project does not appear in subsequent list (archivedAt filter)", async () => {
    const allProjects = [
      fakeProject,
      { ...fakeProject, id: "proj_2", archivedAt: new Date("2026-05-15") },
    ];
    // listProjects simulates the archivedAt: null Prisma filter
    const result = await handleListProjects(
      fakeSession,
      makeDeps({ listProjects: async () => allProjects.filter((p) => p.archivedAt === null) }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const list = result.data as ProjectRow[];
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("proj_1");
    }
  });
});
