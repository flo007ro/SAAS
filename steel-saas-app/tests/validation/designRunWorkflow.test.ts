import { describe, it, expect, vi } from "vitest";
import { buildRunInput, parseSectionOptions, type RunType } from "../../src/domain/runForm";
import { runBeamEngine } from "../../src/engine/beamEngineRunner";
import { runColumnEngine } from "../../src/engine/columnEngineRunner";
import { runBasePlateEngine } from "../../src/engine/basePlateEngineRunner";
import { validateRunInput } from "../../src/engine/runInputValidation";
import { sectionSeedV1 } from "../../src/domain/sections/sectionSeed.v1";
import { designResultSchema } from "../../src/domain/resultContract";
import { handleCreateDesignRun, type HandlerDeps } from "../../src/app/api/design-runs/handler";

const fields = {
  metric: { factoredMoment: "100", factoredShear: "50", factoredCompression: "500", effectiveLength: "3000", plateN: "450", plateB: "400", concreteStrength: "28", plateFy: "250" },
  imperial: { factoredMoment: "100", factoredShear: "20", factoredCompression: "100", effectiveLength: "120", plateN: "20", plateB: "18", concreteStrength: "4", plateFy: "36" },
};
const engines = { beam: runBeamEngine, column: runColumnEngine, base_plate: runBasePlateEngine };

describe("module / units / code matrix", () => {
  for (const type of ["beam", "column", "base_plate"] as const) {
    for (const unitSystem of ["metric", "imperial"] as const) {
      for (const codeProfile of ["CSA_S16_19", "AISC_360_22"] as const) {
        it(`${type} / ${unitSystem} / ${codeProfile}`, () => {
          const project = { unitSystem, codeProfile };
          const sections = parseSectionOptions(sectionSeedV1, codeProfile, unitSystem);
          const input = buildRunInput(type, unitSystem, codeProfile, fields[unitSystem], sections[0]?.designation ?? "W12x40");
          if (!sections.length) {
            expect(() => engines[type]("matrix", project, input)).toThrow(/compatible/);
          } else {
            const result = engines[type]("matrix", project, input);
            expect(designResultSchema.safeParse(result).success).toBe(true);
            expect(result.codeProfile).toBe(codeProfile);
            expect(result.unitSystem).toBe(unitSystem);
            expect(result.sectionSnapshot?.designation).toBe(sections[0].designation);
            expect(Object.values(result.displayResults).filter(v => typeof v === "number").every(Number.isFinite)).toBe(true);
            expect(result.displayResults.pass).toBe(true);
          }
        });
      }
    }
  }
});

describe("input and section regressions", () => {
  const project = { unitSystem: "metric", codeProfile: "CSA_S16_19" } as const;
  const input = () => buildRunInput("beam", "metric", "CSA_S16_19", fields.metric, "W310x60");
  it("accepts section objects and rejects malformed responses instead of rendering them", () => {
    expect(parseSectionOptions(sectionSeedV1, "CSA_S16_19", "metric").map(s => s.designation)).toEqual(["W310x39", "W310x60"]);
    for (const response of [null, { error: "Unauthorized" }, ["W310x60"], [{ designation: {} }]]) {
      expect(() => parseSectionOptions(response, "CSA_S16_19", "metric")).toThrow();
    }
  });
  it.each(["", " ", "0", "-1", "NaN", "Infinity", "12abc"])("rejects invalid numeric text %j", raw => {
    expect(() => buildRunInput("beam", "metric", "CSA_S16_19", { ...fields.metric, factoredMoment: raw }, "W310x60")).toThrow(/finite/);
  });
  it("rejects project context tampering", () => {
    expect(() => validateRunInput("beam", project, { ...input(), unitSystem: "imperial" })).toThrow(/match the project/);
    expect(() => validateRunInput("beam", project, { ...input(), codeProfile: "AISC_360_22" })).toThrow(/match the project/);
  });
  it("rejects incompatible section and wrong physical units", () => {
    const body = input();
    body.displayValues.selectedSection.value = "W12x40";
    expect(() => validateRunInput("beam", project, body)).toThrow(/compatible/);
    body.displayValues.selectedSection.value = "W310x60";
    body.displayValues.factoredMoment.unit = "kip-ft";
    expect(() => validateRunInput("beam", project, body)).toThrow(/kN-m/);
  });
  it.each([0, -1, NaN, Infinity])("rejects nonpositive/nonfinite server input %j", value => {
    const body = input(); body.displayValues.factoredMoment.value = value;
    expect(() => validateRunInput("beam", project, body)).toThrow(/finite/);
  });
  it("rejects an undersized plate before calculation", () => {
    const body = buildRunInput("base_plate", "metric", "CSA_S16_19", { ...fields.metric, plateN: "200" }, "W310x60");
    expect(() => runBasePlateEngine("bad", project, body)).toThrow(/cover/);
  });
  it("rejects overflow rather than storing nonfinite results", () => {
    const body = input();
    body.displayValues.factoredMoment.value = Number.MAX_VALUE;
    expect(() => runBeamEngine("overflow", project, body)).toThrow(/numeric range/);
  });
  it("checks imperial force and moment normalization", () => {
    const result = runBeamEngine("conversion", { unitSystem: "imperial", codeProfile: "AISC_360_22" }, buildRunInput("beam", "imperial", "AISC_360_22", fields.imperial, "W12x40"));
    expect(result.normalizedInputs.factoredMomentNmm).toBeCloseTo(100 * 1355817.9483314, -2);
    expect(result.normalizedInputs.factoredShearN).toBeCloseTo(20 * 4448.2216152605, 0);
  });

  it("rejects another organization's project and invalid input without persistence", async () => {
    const create = vi.fn();
    const deps = { findProject: async () => ({ found: true, belongsToOrg: false, project: { ...project, id: "p" } }), createDesignRun: create } as unknown as HandlerDeps;
    const body = { type: "beam" as RunType, projectId: "p", title: "test", inputJson: input() };
    const session = { userId: "u", organizationId: "org" };
    expect(await handleCreateDesignRun(body, session, deps)).toMatchObject({ ok: false, httpStatus: 403 });
    deps.findProject = async () => ({ found: true, belongsToOrg: true, project: { ...project, id: "p" } });
    body.inputJson.displayValues.factoredMoment.value = 0;
    expect(await handleCreateDesignRun(body, session, deps)).toMatchObject({ ok: false, httpStatus: 400 });
    expect(create).not.toHaveBeenCalled();
  });
});

// Synthetic conversion check: arithmetic equivalence, not a reference-data or code certification.
describe("physical-unit equivalence", () => {
  it("preserves beam and plate capacities for the same physical inputs", async () => {
    const { calculateBeamDesign } = await import("../../src/engine/beamDesign");
    const { calculateBasePlateDesign } = await import("../../src/engine/basePlateDesign");
    const s = sectionSeedV1[0];
    const inch = 25.4, ksi = 6.894757293168;
    const imperial = { ...s, unitSystem: "imperial" as const, area: s.area / inch ** 2,
      depth: s.depth / inch, flangeWidth: s.flangeWidth / inch, webThickness: s.webThickness / inch,
      flangeThickness: s.flangeThickness / inch, sx: s.sx / inch ** 3, ix: s.ix / inch ** 4,
      rx: s.rx / inch, ry: s.ry / inch, fy: s.fy / ksi };
    const common = { runId: "units", codeProfile: "CSA_S16_19" as const };
    const metricBeam = calculateBeamDesign({ ...common, unitSystem: "metric", section: s,
      factoredMoment: { label: "Factored moment", value: 100, unit: "kN-m" }, factoredShear: { label: "Factored shear", value: 50, unit: "kN" } });
    const imperialBeam = calculateBeamDesign({ ...common, unitSystem: "imperial", section: imperial,
      factoredMoment: { label: "Factored moment", value: 100 / 1.3558179483314, unit: "kip-ft" }, factoredShear: { label: "Factored shear", value: 50 / 4.4482216152605, unit: "kip" } });
    expect(imperialBeam.displayResults.momentDCR).toBe(metricBeam.displayResults.momentDCR);
    expect(imperialBeam.displayResults.shearDCR).toBe(metricBeam.displayResults.shearDCR);
    const metricPlate = calculateBasePlateDesign({ ...common, unitSystem: "metric", section: s,
      factoredCompression: { label: "Factored compression", value: 500, unit: "kN" },
      plateN: { label: "N", value: 450, unit: "mm" }, plateB: { label: "B", value: 400, unit: "mm" },
      concreteStrength: { label: "Concrete", value: 28, unit: "MPa" }, plateFy: { label: "Fy", value: 250, unit: "MPa" } });
    const imperialPlate = calculateBasePlateDesign({ ...common, unitSystem: "imperial", section: imperial,
      factoredCompression: { label: "Factored compression", value: 500 / 4.4482216152605, unit: "kip" },
      plateN: { label: "N", value: 450 / inch, unit: "in" }, plateB: { label: "B", value: 400 / inch, unit: "in" },
      concreteStrength: { label: "Concrete", value: 28 / ksi, unit: "ksi" }, plateFy: { label: "Fy", value: 250 / ksi, unit: "ksi" } });
    expect(imperialPlate.displayResults.bearingDCR).toBe(metricPlate.displayResults.bearingDCR);
    expect(Number(imperialPlate.displayResults.tpRequired) * inch).toBeCloseTo(Number(metricPlate.displayResults.tpRequired), 0);
  });
});
