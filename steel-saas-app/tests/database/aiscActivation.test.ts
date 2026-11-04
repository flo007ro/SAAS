import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { writeAiscActivation } from "../../prisma/aiscActivation";

it("refuses missing rights confirmation and invalid data before changing the active file", () => {
  const dir = mkdtempSync(join(tmpdir(), "steel-aisc-activation-"));
  const target = join(dir, "active.json");
  try {
    expect(() => writeAiscActivation({}, false, target)).toThrow("rights");
    expect(() => writeAiscActivation({}, true, target)).toThrow();
    expect(() => readFileSync(target)).toThrow();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("writes a validated catalog to the chosen test target without leftover temporary files", () => {
  const dir = mkdtempSync(join(tmpdir(), "steel-aisc-activation-"));
  const target = join(dir, "active.json");
  const payload = {
    format: "steel-saas-aisc-v1",
    source: { publisher: "AISC", release: "16.0", worksheet: "Database v16.0",
      url: "https://www.aisc.org/aisc/publications/steel-construction-manual/aisc-shapes-database-v160/",
      workbookSha256: "c".repeat(64), unitSystem: "imperial", material: "ASTM_A992_Fy50ksi",
      totalRows: 1, excludedNonWRows: 0 },
    rows: [{ AISC_Manual_Label: "W10X20", W: 20, A: 6, d: 10, bf: 6,
      tw: 0.2, tf: 0.3, Sx: 20, Ix: 100, rx: 4, Sy: 6, Iy: 18, ry: 1.7 }],
  };
  try {
    expect(writeAiscActivation(payload, true, target)).toEqual({ sections: 1,
      sectionDbVersion: "aisc-16.0-us-a992-50ksi-cccccccccccc" });
    expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(payload);
    expect(() => writeAiscActivation({}, true, target)).toThrow();
    expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(payload);
    expect(readdirSync(dir)).toEqual(["active.json"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
