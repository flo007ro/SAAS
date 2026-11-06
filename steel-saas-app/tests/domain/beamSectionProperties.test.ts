import { describe, expect, it } from "vitest";
import { parseAiscCatalog } from "../../src/domain/sections/aiscCatalog";
import { convertSectionUnits } from "../../src/domain/sections/sectionUnits";
import { sectionFixturesV1 } from "../../src/domain/sections/sectionSeed.v1";
import activated from "../../src/domain/sections/aiscCatalog.generated.json";

const fields = { Zx: 57, J: 0.906, Cw: 1440, rts: 2.21, ho: 11.4,
  kdes: 1.02, "h/tw": 33.6, "bf/2tf": 7.77 };
function payload(extras: Record<string, unknown> = {}) {
  return { format: "steel-saas-aisc-v1", source: { ...activated.source, totalRows: 1, excludedNonWRows: 0 },
    rows: [{ ...activated.rows.find(s => s.AISC_Manual_Label === "W12X40")!, ...extras }] };
}

describe("verified beam section properties", () => {
  it("retains optional workbook fields without approximating them from geometry", () => {
    const [section] = parseAiscCatalog(payload(fields));
    expect(section).toMatchObject({ zx: 57, j: 0.906, cw: 1440, rts: 2.21,
      ho: 11.4, kdes: 1.02, hOverTw: 33.6, bfOver2tf: 7.77 });
    expect(section.sectionDbVersion).toContain("-beam-v1");
    expect(section.sourceNote).toContain(activated.source.workbookSha256);
    expect(section.sourceNote).toContain("in6");
  });
  it.each(Object.keys(fields))("rejects invalid optional %s rather than coercing or ignoring it", field => {
    for (const value of [0, -1, null, "1", Infinity, NaN]) {
      expect(() => parseAiscCatalog(payload({ [field]: value }))).toThrow();
    }
  });
  it("scales plastic modulus, torsion, warping and lengths with the correct independent powers", () => {
    const [us] = parseAiscCatalog(payload(fields));
    const si = convertSectionUnits(us, "metric");
    expect(si).toMatchObject({ hOverTw: 33.6, bfOver2tf: 7.77,
      designation: "W12x40", standard: "AISC_360_22", sectionDbVersion: us.sectionDbVersion });
    expect(si.zx).toBeCloseTo(934062.648, 6);
    expect(si.j).toBeCloseTo(377105.6715936, 5);
    expect(si.cw).toBeCloseTo(386691647817.7382, 2);
    expect(si.rts).toBeCloseTo(56.134, 10);
    expect(si.ho).toBeCloseTo(289.56, 10);
    expect(si.kdes).toBeCloseTo(25.908, 10);
    const back = convertSectionUnits(si, "imperial");
    for (const field of ["zx", "j", "cw", "rts", "ho", "kdes", "hOverTw", "bfOver2tf"] as const) {
      expect(Math.abs(back[field]! / us[field]! - 1)).toBeLessThan(1e-12);
    }
  });
  it("does not manufacture missing properties for legacy/CSA references in either unit system", () => {
    const legacy = payload();
    for (const field of Object.keys(fields)) delete (legacy.rows[0] as Record<string, unknown>)[field];
    expect(parseAiscCatalog(legacy)[0]).not.toHaveProperty("zx");
    expect(parseAiscCatalog(legacy)[0].sectionDbVersion).not.toContain("-beam-v1");
    for (const source of sectionFixturesV1.filter(s => s.standard === "CSA_S16_19")) {
      for (const section of [source, convertSectionUnits(source, "imperial")]) {
        for (const field of ["zx", "j", "cw", "rts", "ho", "kdes", "hOverTw", "bfOver2tf"]) {
          expect(section).not.toHaveProperty(field);
        }
      }
    }
  });
  it("keeps all eight verified properties in every activated W row", () => {
    const sections = parseAiscCatalog(activated);
    expect(sections).toHaveLength(289);
    for (const s of sections) {
      for (const field of ["zx", "j", "cw", "rts", "ho", "kdes", "hOverTw", "bfOver2tf"] as const) {
        expect(s[field], `${s.designation} ${field}`).toBeGreaterThan(0);
      }
    }
  });
});
