import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BeamChecks } from "../../src/domain/resultContract";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), run: vi.fn(), project: vi.fn() }));
vi.mock("../../src/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("../../src/lib/prisma", () => ({ prisma: { designRun: { findFirst: mocks.run }, project: { findFirst: mocks.project } } }));
vi.mock("../../src/components/profiles/ProfileViewer", () => ({ default: () => null }));
import RunPage from "../../src/app/(app)/projects/[projectId]/runs/[runId]/page";
import ProjectPage from "../../src/app/(app)/projects/[projectId]/page";

const checks: BeamChecks = {
  flexure: { status: "pass", summary: "Flexure satisfied" },
  shear: { status: "pass", summary: "Shear satisfied" },
  sectionClassification: { status: "pass", summary: "Compact section" },
  lateralTorsionalBuckling: { status: "pass", summary: "Bracing verified" },
  deflection: { status: "pass", summary: "Serviceability satisfied" },
};
const project = { id: "p", name: "Saved project", codeProfile: "CSA_S16_19", unitSystem: "metric" };
function setup(beamChecks?: BeamChecks, pass = true, unitSystem = "metric") {
  const run = {
    id: "r", title: "Saved beam", projectId: "p", project, type: "beam", status: "complete", createdAt: new Date("2026-01-01"),
    resultJson: {
      unitSystem,
      displayResults: { pass, momentDCR: 1, shearDCR: 0.5, liveDeflectionMm: 25.4, totalDeflectionMm: 50.8, liveLimitMm: 76.2, totalLimitMm: 101.6 },
      displayInputSnapshot: { span: { label: "Span", value: 6000, unit: "mm" }, sourceNote: { label: "Section source", value: "LongUnbrokenSource".repeat(25), unit: "text" } },
      warnings: [], calculationLines: ["Scope: user-saved statement"],
      ...(beamChecks ? { beamChecks } : {}),
    },
  };
  mocks.run.mockResolvedValue(run);
  mocks.project.mockResolvedValue({ ...project, designRuns: [run] });
}
async function render() {
  return {
    detail: renderToStaticMarkup(await RunPage({ params: Promise.resolve({ projectId: "p", runId: "r" }) })),
    list: renderToStaticMarkup(await ProjectPage({ params: Promise.resolve({ projectId: "p" }) })),
  };
}

describe("saved beam result pages", () => {
  beforeEach(() => { mocks.auth.mockResolvedValue({ user: { organizationId: "org" } }); });
  it.each([['kN-m', 'kN'], ['kip-ft', 'kip']])("shows unverified diagnostics using saved %s/%s units without a pass badge", async (momentUnit, shearUnit) => {
    const omitted = Object.fromEntries(Object.keys(checks).map(key => [key, { status: "not_checked", summary: "Assessment unavailable" }])) as BeamChecks;
    setup(omitted, false);
    const run = await mocks.run();
    run.resultJson.displayInputSnapshot.factoredMoment = { label: "Factored moment", value: 10, unit: momentUnit };
    run.resultJson.displayInputSnapshot.factoredShear = { label: "Factored shear", value: 5, unit: shearUnit };
    run.resultJson.displayResults = { pass: false, legacyElasticMomentCapacity: 125, legacySimplifiedShearCapacity: 80, legacyElasticMomentDCR: 0.5, legacySimplifiedShearDCR: 1.5 };
    const { detail } = await render();
    expect(detail).toContain("Engineering review required");
    expect(detail).not.toContain("Implemented checks pass");
    const section = detail.slice(detail.indexOf("Legacy diagnostics"), detail.indexOf("CALCULATION DETAILS"));
    expect(section).toContain(`125 ${momentUnit}`);
    expect(section).toContain(`80 ${shearUnit}`);
    expect(section).toContain("0.5");
    expect(section).toContain("1.5");
    expect(section).toContain("Uses original catalog Fy");
    expect(section).toContain("do not establish full flexure or shear adequacy");
    expect(section).not.toContain("#34d399");
    expect(section).not.toContain("#f87171");
    expect(section).not.toContain("✓");
  });
  it.each(["pass", "fail", "not_checked"] as const)("uses %s status instead of legacy boolean or rounded ratio", async status => {
    setup({ ...checks, flexure: { status, summary: "Unrounded authoritative assessment", ratio: 1 } }, status !== "pass");
    const { detail, list } = await render();
    const verdict = status === "pass" ? "Implemented checks pass" : status === "fail" ? "Implemented checks fail" : "Engineering review required";
    expect(detail).toContain(verdict);
    expect(list).toContain(verdict);
    expect(detail).toContain("Unrounded authoritative assessment");
    expect(detail).toContain("Bracing verified");
    expect(detail).toContain("6000 mm");
    expect(detail).toContain("Scope: user-saved statement");
    expect(detail).not.toContain("elastic major-axis flexure and simplified shear only");
    expect(detail).toMatch(status === "fail" ? /color:#f87171[^>]*>1\.000/ : status === "not_checked" ? /color:#e8edf0[^>]*>1\.000/ : /color:#34d399[^>]*>1\.000/);
  });
  it("preserves absent-field legacy scope and verdict", async () => {
    setup();
    const { detail, list } = await render();
    expect(detail).toContain("Implemented checks pass");
    expect(list).toContain("Implemented checks pass");
    expect(detail).toContain("elastic major-axis flexure and simplified shear only");
  });
  it("renders native imperial serviceability and wrapping snapshot rows", async () => {
    setup(checks, true, "imperial");
    const { detail } = await render();
    for (const value of ["1 in", "2 in", "3 in", "4 in"]) expect(detail).toContain(value);
    expect(detail).toContain("flex-wrap:wrap");
    expect(detail).toContain("overflow-wrap:anywhere");
    expect(detail).toContain("max-width:100%");
    expect(detail).toContain("clamp(16px, 4%, 56px)");
    expect(detail).toContain("LongUnbrokenSource".repeat(25));
  });
  it("does not pass malformed historical checks or inject legacy scope", async () => {
    setup({ ...checks, flexure: { status: "pass", summary: "Invalid ratio", ratio: 2 } });
    const { detail, list } = await render();
    expect(detail).toContain("Engineering review required");
    expect(list).toContain("Engineering review required");
    expect(detail).not.toContain("Implemented checks pass");
    expect(detail).not.toContain("elastic major-axis flexure and simplified shear only");
  });
});
