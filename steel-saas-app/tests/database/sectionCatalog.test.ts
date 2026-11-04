import { describe, expect, it, vi } from "vitest";
import { buildSectionCatalog } from "../../src/domain/sections/sectionCatalog";
import { sectionSeedV1, sectionFixturesV1 } from "../../src/domain/sections/sectionSeed.v1";
import { findSections } from "../../src/domain/sections/sectionLookup";
import { parseSectionOptions } from "../../src/domain/runForm";

const officialInput = {
  format: "steel-saas-aisc-v1",
  source: { publisher: "AISC", release: "16.0", worksheet: "Database v16.0",
    url: "https://www.aisc.org/aisc/publications/steel-construction-manual/aisc-shapes-database-v160/",
    workbookSha256: "b".repeat(64), unitSystem: "imperial", material: "ASTM_A992_Fy50ksi",
    totalRows: 1, excludedNonWRows: 0 },
  rows: [{ AISC_Manual_Label: "W10X20", W: 20, A: 6, d: 10, bf: 6,
    tw: 0.2, tf: 0.3, Sx: 20, Ix: 100, rx: 4, Sy: 6, Iy: 18, ry: 1.7 }],
};

describe("shared application section catalog", () => {
  it("uses legacy references only while no official catalog is activated", () => {
    expect(buildSectionCatalog(sectionFixturesV1, null)).toHaveLength(6);
    expect(buildSectionCatalog(sectionSeedV1, null)).toEqual(sectionSeedV1);
  });
  it("replaces AISC fixture data consistently for lookup and form options, retaining CSA", () => {
    const catalog = buildSectionCatalog(sectionSeedV1, officialInput);
    expect(catalog.filter(s => s.standard === "CSA_S16_19")).toHaveLength(4);
    expect(findSections(catalog, { standard: "AISC_360_22", unitSystem: "imperial" })
      .map(s => s.designation)).toEqual(["W10x20"]);
    expect(parseSectionOptions(catalog, "AISC_360_22", "imperial").map(s => s.designation))
      .toEqual(["W10x20"]);
    expect(catalog.find(s => s.designation === "W10x20")?.sectionDbVersion)
      .toBe("aisc-16.0-us-a992-50ksi-bbbbbbbbbbbb");
    expect(sectionSeedV1.some(s => s.designation === "W12x40")).toBe(true);
  });
  it("fails closed for invalid activation instead of silently falling back to fixtures", () => {
    expect(() => buildSectionCatalog(sectionSeedV1, { ...officialInput, rows: [] })).toThrow();
  });
  it("makes an activated designation available to form options and real engine validation together", async () => {
    vi.resetModules();
    vi.doMock("../../src/domain/sections/aiscCatalog.generated.json", () => ({ default: officialInput }));
    try {
      const { sectionSeedV1: active } = await import("../../src/domain/sections/sectionSeed.v1");
      const { validateRunInput } = await import("../../src/engine/runInputValidation");
      const { buildRunInput } = await import("../../src/domain/runForm");
      expect(parseSectionOptions(active, "AISC_360_22", "imperial").map(s => s.designation))
        .toEqual(["W10x20"]);
      const section = validateRunInput("beam", { codeProfile: "AISC_360_22", unitSystem: "imperial" },
        buildRunInput("beam", "imperial", "AISC_360_22", { factoredMoment: "10", factoredShear: "2" }, "W10x20"));
      expect(section).toMatchObject({ designation: "W10x20", area: 6, ix: 100,
        sectionDbVersion: "aisc-16.0-us-a992-50ksi-bbbbbbbbbbbb" });
    } finally {
      vi.doUnmock("../../src/domain/sections/aiscCatalog.generated.json");
      vi.resetModules();
    }
  });
});
