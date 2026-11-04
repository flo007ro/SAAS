import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), org: vi.fn(), run: vi.fn(), project: vi.fn(), invalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("../../src/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("../../src/lib/prisma", () => ({ prisma: { organization: { findUnique: mocks.org } } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.invalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../../src/app/api/design-runs/handler", () => ({ handleCreateDesignRun: mocks.run }));
vi.mock("../../src/app/api/projects/handler", () => ({ handleCreateProject: mocks.project }));
vi.mock("../../src/app/api/projects/prismaProjectDeps", () => ({ buildProjectDeps: vi.fn() }));
import { createRunAction } from "../../src/app/(app)/projects/[projectId]/runs/new/actions";
import { createProjectAction } from "../../src/app/(app)/projects/new/actions";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BILLING_MODE", "paid");
  mocks.auth.mockResolvedValue({ user: { userId: "user_1", organizationId: "org_1" } });
  mocks.org.mockResolvedValue({ subscriptionStatus: "active" });
  mocks.run.mockResolvedValue({ ok: true, designRun: { id: "run_saved" } });
  mocks.project.mockResolvedValue({ ok: true, data: { id: "project_saved" } });
  mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
});
afterEach(() => vi.unstubAllEnvs());

const form = () => {
  const data = new FormData();
  Object.entries({ projectId: "project_1", type: "beam", title: "Beam", unitSystem: "metric", codeProfile: "AISC_360_22", factoredMoment: "10", factoredShear: "10", selectedSection: "test W" }).forEach(([k, v]) => data.set(k, v));
  return data;
};

describe("saved action cache invalidation", () => {
  it("invalidates saved-run summaries before redirecting", async () => {
    await expect(createRunAction(null, form())).rejects.toThrow("redirect");
    expect(mocks.invalidate.mock.calls).toEqual([["/projects/project_1"], ["/dashboard"], ["/projects"]]);
    expect(mocks.run.mock.invocationCallOrder[0]).toBeLessThan(mocks.invalidate.mock.invocationCallOrder[0]);
    expect(mocks.invalidate.mock.invocationCallOrder.at(-1)).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0]);
    expect(mocks.redirect).toHaveBeenCalledWith("/projects/project_1/runs/run_saved");
    const input = mocks.run.mock.calls[0][0].inputJson.displayValues;
    expect(input.factoredMoment.label).toContain("M_u");
    expect(input.factoredShear.label).toContain("V_u");
  });
  it("invalidates dashboard and projects after project creation before redirect", async () => {
    await expect(createProjectAction(null, form())).rejects.toThrow("redirect");
    expect(mocks.invalidate.mock.calls).toEqual([["/dashboard"], ["/projects"]]);
    expect(mocks.project.mock.invocationCallOrder[0]).toBeLessThan(mocks.invalidate.mock.invocationCallOrder[0]);
    expect(mocks.invalidate.mock.invocationCallOrder.at(-1)).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0]);
  });
  it("does not invalidate or redirect on failed saves or unauthenticated submissions", async () => {
    mocks.run.mockResolvedValue({ ok: false, error: "Not found" });
    mocks.project.mockResolvedValue({ ok: false, error: "Not found" });
    await createRunAction(null, form());
    await createProjectAction(null, form());
    mocks.auth.mockResolvedValue(null);
    await createRunAction(null, form());
    await createProjectAction(null, form());
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
