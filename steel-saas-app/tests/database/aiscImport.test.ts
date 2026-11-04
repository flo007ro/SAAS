import { describe, expect, it } from "vitest";
import { parseAiscCatalog } from "../../prisma/aiscCatalog";
import { parseSectionImportOptions, planSectionImport } from "../../prisma/sectionImport";

// Synthetic row: deliberately not an extract or a redistributed AISC catalog.
function catalog() {
  return {
    format: "steel-saas-aisc-v1",
    source: {
      publisher: "AISC", release: "16.0", worksheet: "Database v16.0",
      url: "https://www.aisc.org/aisc/publications/steel-construction-manual/aisc-shapes-database-v160/",
      workbookSha256: "a".repeat(64), unitSystem: "imperial", material: "ASTM_A992_Fy50ksi",
      totalRows: 2, excludedNonWRows: 1,
    },
    rows: [{ AISC_Manual_Label: "W10X20", W: 20, A: 6, d: 10, bf: 6,
      tw: 0.2, tf: 0.3, Sx: 20, Ix: 100, rx: 4, Sy: 6, Iy: 18, ry: 1.7 }],
  };
}

describe("AISC official-workbook ingestion", () => {
  it("maps imperial W properties without SI scaling and records source and material assumptions", () => {
    const [s] = parseAiscCatalog(catalog());
    expect(s).toMatchObject({ designation: "W10x20", standard: "AISC_360_22", unitSystem: "imperial",
      family: "W", area: 6, weightOrMass: 20, depth: 10, flangeWidth: 6,
      webThickness: 0.2, flangeThickness: 0.3, sx: 20, ix: 100, rx: 4,
      sy: 6, iy: 18, ry: 1.7, fy: 50 });
    expect(s.sectionDbVersion).toBe("aisc-16.0-us-a992-50ksi-aaaaaaaaaaaa");
    expect(s.sourceNote).toContain("a".repeat(64));
    expect(s.sourceNote).toContain("assumption");
  });
  it("rejects malformed numbers, metric exports, unsupported releases, duplicate labels and empty data", () => {
    for (const value of [0, -1, Infinity, NaN, "20", null]) {
      const data = catalog(); data.rows[0].A = value as number;
      expect(() => parseAiscCatalog(data)).toThrow();
    }
    const metric = catalog(); metric.source.unitSystem = "metric";
    expect(() => parseAiscCatalog(metric)).toThrow();
    const release = catalog(); release.source.release = "15.0";
    expect(() => parseAiscCatalog(release)).toThrow();
    const duplicate = catalog(); duplicate.rows.push({ ...duplicate.rows[0] });
    duplicate.source.totalRows++;
    expect(() => parseAiscCatalog(duplicate)).toThrow("Duplicate");
    const empty = catalog(); empty.rows = [];
    expect(() => parseAiscCatalog(empty)).toThrow();
  });
  it("refuses non-W data, missing weak-axis properties and unreconciled counts", () => {
    const nonW = catalog(); nonW.rows[0].AISC_Manual_Label = "HSS10X10";
    expect(() => parseAiscCatalog(nonW)).toThrow();
    const missing = catalog(); delete (missing.rows[0] as { Sy?: number }).Sy;
    expect(() => parseAiscCatalog(missing)).toThrow();
    const counts = catalog(); counts.source.totalRows++;
    expect(() => parseAiscCatalog(counts)).toThrow("counts");
  });
  it("imports supplied catalogs idempotently instead of silently falling back to fixtures", () => {
    const sections = parseAiscCatalog(catalog());
    const plan = planSectionImport([], sections);
    expect(plan.create).toHaveLength(1);
    expect(plan.create[0].sourceNote).not.toContain("geometry-derived");
    expect(planSectionImport(plan.create, sections)).toEqual({ create: [], skipped: 1 });
    expect(() => planSectionImport([], [...sections, ...sections])).toThrow("Duplicate");
  });
  it("requires rights acknowledgement only for explicit catalog writes", () => {
    expect(parseSectionImportOptions(["--aisc-catalog", "local.json"]))
      .toEqual({ apply: false, aiscCatalog: "local.json" });
    expect(() => parseSectionImportOptions(["--aisc-catalog"])).toThrow();
    expect(() => parseSectionImportOptions(["--apply", "--aisc-catalog", "local.json",
      "--acknowledge-provenance-limitations"])).toThrow("rights");
    expect(parseSectionImportOptions(["--apply", "--aisc-catalog", "local.json",
      "--acknowledge-provenance-limitations", "--confirm-data-use-rights"]).apply).toBe(true);
  });
});
