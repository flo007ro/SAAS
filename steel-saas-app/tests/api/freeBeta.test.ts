import { afterEach, describe, expect, it, vi } from "vitest";
import { enforceSubscription } from "../../src/lib/subscriptionGuard";
import { handleGetProject, handleListProjects, type ProjectHandlerDeps } from "../../src/app/api/projects/handler";

afterEach(() => vi.unstubAllEnvs());

describe("billing mode access", () => {
  it.each([undefined, "", "paid", "FREE_BETA", "unknown"])("retains paid rules for mode %s", (mode) => {
    vi.stubEnv("BILLING_MODE", mode);
    expect(enforceSubscription("active").allowed).toBe(true);
    for (const status of ["none", "past_due", "canceled", "", null, undefined]) {
      expect(enforceSubscription(status).allowed).toBe(false);
    }
  });

  it.each(["active", "none", "past_due", "canceled", ""])("allows existing org status %s in free beta", (status) => {
    vi.stubEnv("BILLING_MODE", "free_beta");
    expect(enforceSubscription(status)).toEqual({ allowed: true });
  });

  it.each([null, undefined])("denies missing organization status %s even in free beta", (status) => {
    vi.stubEnv("BILLING_MODE", "free_beta");
    expect(enforceSubscription(status).allowed).toBe(false);
  });

  it("keeps project reads tenant-scoped and cross-tenant projects unavailable", async () => {
    vi.stubEnv("BILLING_MODE", "free_beta");
    const listProjects = vi.fn().mockResolvedValue([]);
    const findProject = vi.fn().mockResolvedValue(null);
    const deps: ProjectHandlerDeps = {
      subscriptionStatus: "none", listProjects, findProject,
      createProject: vi.fn(), patchProject: vi.fn(), archiveProject: vi.fn(),
    };
    const session = { userId: "user_1", organizationId: "org_1" };
    expect((await handleListProjects(session, deps)).ok).toBe(true);
    expect(listProjects).toHaveBeenCalledWith("org_1");
    expect(await handleGetProject("other_tenant_project", session, deps)).toEqual({ ok: false, httpStatus: 404, error: "Project not found." });
    expect(findProject).toHaveBeenCalledWith("other_tenant_project", "org_1");
    deps.subscriptionStatus = null;
    listProjects.mockClear();
    expect((await handleListProjects(session, deps)).httpStatus).toBe(402);
    expect(listProjects).not.toHaveBeenCalled();
  });
});
