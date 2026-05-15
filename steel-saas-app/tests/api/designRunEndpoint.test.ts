import { describe, expect, it } from "vitest";
import { handleCreateDesignRun, type HandlerDeps, type DesignRunRow, type ProjectRow } from "../../src/app/api/design-runs/handler";
import { designRunRequestSchema } from "../../src/app/api/design-runs/schema";
import { EngineError } from "../../src/engine/engineError";

// ── fixtures ────────────────────────────────────────────────────────────────

const fakeProject: ProjectRow = { id: "proj_1", codeProfile: "CSA_S16_19", unitSystem: "metric" };
const fakeSession = { userId: "user_1", organizationId: "org_1" };

const validBeamBody = designRunRequestSchema.parse({
  type: "beam",
  projectId: "proj_1",
  title: "Test beam",
  inputJson: {
    unitSystem: "metric",
    codeProfile: "CSA_S16_19",
    displayValues: {
      factoredMoment: { label: "Factored moment, M_f", value: 125, unit: "kN-m" },
      factoredShear: { label: "Factored shear, V_f", value: 80, unit: "kN" },
      selectedSection: { label: "Selected section", value: "W310x60", unit: "designation" },
    },
  },
});

const makeRun = (overrides: Partial<DesignRunRow> = {}): DesignRunRow => ({
  id: "run_1",
  type: "beam",
  title: "Test beam",
  status: "draft",
  inputJson: {},
  resultJson: null,
  errorCode: null,
  ...overrides,
});

const makeDeps = (overrides: Partial<HandlerDeps> = {}): HandlerDeps => ({
  findProject: async () => ({ found: true, belongsToOrg: true, project: fakeProject }),
  createDesignRun: async () => makeRun(),
  updateDesignRun: async (_id, patch) =>
    makeRun({
      status: patch.status,
      resultJson: patch.resultJson ?? null,
      errorCode: patch.errorCode ?? null,
    }),
  runBeamEngine: async () => ({ pass: true, governingRatio: 0.4 }),
  runColumnEngine: async () => ({ pass: true, demandCapacityRatio: 0.5 }),
  runBasePlateEngine: async () => ({ pass: true, moduleType: "base_plate" }),
  ...overrides,
});

// ── schema validation ────────────────────────────────────────────────────────

describe("designRunRequestSchema", () => {
  it("accepts a valid beam request", () => {
    const result = designRunRequestSchema.safeParse({
      type: "beam",
      projectId: "proj_1",
      title: "Test beam",
      inputJson: {
        unitSystem: "metric",
        codeProfile: "CSA_S16_19",
        displayValues: { factoredMoment: { label: "M_f", value: 125, unit: "kN-m" } },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid type", () => {
    const result = designRunRequestSchema.safeParse({
      type: "truss",
      projectId: "proj_1",
      title: "t",
      inputJson: { unitSystem: "metric", codeProfile: "CSA_S16_19", displayValues: {} },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing title", () => {
    const result = designRunRequestSchema.safeParse({
      type: "beam",
      projectId: "proj_1",
      inputJson: { unitSystem: "metric", codeProfile: "CSA_S16_19", displayValues: {} },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing projectId", () => {
    const result = designRunRequestSchema.safeParse({
      type: "beam",
      title: "t",
      inputJson: { unitSystem: "metric", codeProfile: "CSA_S16_19", displayValues: {} },
    });
    expect(result.success).toBe(false);
  });
});

// ── handler ──────────────────────────────────────────────────────────────────

describe("handleCreateDesignRun", () => {
  it("returns 404 when project is not found", async () => {
    const result = await handleCreateDesignRun(
      validBeamBody,
      fakeSession,
      makeDeps({ findProject: async () => ({ found: false }) }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(404);
  });

  it("returns 403 when project belongs to a different org", async () => {
    const result = await handleCreateDesignRun(
      validBeamBody,
      fakeSession,
      makeDeps({
        findProject: async () => ({ found: true, belongsToOrg: false, project: fakeProject }),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(403);
  });

  it("column happy path returns a complete design run", async () => {
    const fakeColumnResult = { pass: true, moduleType: "column", demandCapacityRatio: 0.5 };
    const result = await handleCreateDesignRun(
      { ...validBeamBody, type: "column" },
      fakeSession,
      makeDeps({ runColumnEngine: async () => fakeColumnResult }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.designRun.status).toBe("complete");
      expect(result.designRun.resultJson).toEqual(fakeColumnResult);
    }
  });

  it("base_plate happy path returns a complete design run", async () => {
    const fakeBpResult = { pass: true, moduleType: "base_plate", tpRequired: 32.1 };
    const result = await handleCreateDesignRun(
      { ...validBeamBody, type: "base_plate" },
      fakeSession,
      makeDeps({ runBasePlateEngine: async () => fakeBpResult }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.designRun.status).toBe("complete");
      expect(result.designRun.resultJson).toEqual(fakeBpResult);
    }
  });

  it("beam happy path returns a complete design run with result_json", async () => {
    const fakeResult = { pass: true, governingRatio: 0.4 };
    const result = await handleCreateDesignRun(
      validBeamBody,
      fakeSession,
      makeDeps({ runBeamEngine: async () => fakeResult }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.designRun.status).toBe("complete");
      expect(result.designRun.resultJson).toEqual(fakeResult);
      expect(result.designRun.errorCode).toBeNull();
    }
  });

  it("beam engine failure stores status=failed with the EngineError code", async () => {
    const result = await handleCreateDesignRun(
      validBeamBody,
      fakeSession,
      makeDeps({
        runBeamEngine: async () => {
          throw new EngineError("SECTION_NOT_FOUND", "Section W999x99 not found");
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.designRun.status).toBe("failed");
      expect(result.designRun.errorCode).toBe("SECTION_NOT_FOUND");
    }
  });

  it("unexpected engine errors fall back to ENGINE_ERROR code", async () => {
    const result = await handleCreateDesignRun(
      validBeamBody,
      fakeSession,
      makeDeps({
        runBeamEngine: async () => {
          throw new Error("Out of memory");
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.designRun.status).toBe("failed");
      expect(result.designRun.errorCode).toBe("ENGINE_ERROR");
    }
  });
});
