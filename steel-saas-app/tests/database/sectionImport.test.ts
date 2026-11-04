import { describe, expect, it } from "vitest";
import { planSectionImport, parseImportArguments } from "../../prisma/sectionImport";
import { sectionFixturesV1 as sectionSeedV1 } from "../../src/domain/sections/sectionSeed.v1";

describe("section-only import", () => {
  it("defaults to offline preview and requires provenance acknowledgement for writes", () => {
    expect(parseImportArguments([])).toBe(false);
    expect(() => parseImportArguments(["--apply"])).toThrow("provenance");
    expect(parseImportArguments(["--apply", "--acknowledge-provenance-limitations"])).toBe(true);
    expect(() => parseImportArguments(["--force"])).toThrow("Unknown");
  });
  it("plans the existing dataset without mutating it", () => {
    const plan = planSectionImport([]);
    expect(plan.create).toHaveLength(sectionSeedV1.length);
    expect(plan.create.every(s => s.sourceNote.includes("NOT independently verified"))).toBe(true);
    expect(sectionSeedV1.some(s => s.sourceNote.includes("NOT independently verified"))).toBe(false);
  });
  it("is idempotent and compares the complete versioned identity", () => {
    const first = planSectionImport([]);
    expect(planSectionImport(first.create).create).toHaveLength(0);
    expect(planSectionImport(first.create).skipped).toBe(sectionSeedV1.length);
    expect(planSectionImport([{ ...first.create[0], sectionDbVersion: "older" }]).create)
      .toHaveLength(sectionSeedV1.length);
  });
  it("rejects conflicting properties and duplicate identities without overwriting", () => {
    const row = planSectionImport([]).create[0];
    expect(() => planSectionImport([{ ...row, area: row.area + 1 }])).toThrow("Conflict");
    expect(() => planSectionImport([row, row])).toThrow("Duplicate");
  });
});
