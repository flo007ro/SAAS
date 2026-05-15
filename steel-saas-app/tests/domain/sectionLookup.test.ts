import { describe, expect, it } from "vitest";
import { findSections, findLightestPassingSection } from "../../src/domain/sections/sectionLookup";
import { sectionSeedV1 } from "../../src/domain/sections/sectionSeed.v1";

describe("sectionLookup", () => {
  it("searches sections by designation", () => {
    const results = findSections(sectionSeedV1, { query: "W310", standard: "CSA_S16_19" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].designation).toContain("W310");
  });

  it("returns the lightest passing section without mutating the current run", () => {
    const suggestion = findLightestPassingSection(sectionSeedV1, {
      standard: "CSA_S16_19",
      unitSystem: "metric",
      passes: (section) => section.weightOrMass >= 60,
    });

    expect(suggestion?.designation).toBe("W310x60");
  });
});
