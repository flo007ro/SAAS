import { z } from "zod";
import type { SteelSection } from "./sectionTypes";

export const aiscSourceUrl = "https://www.aisc.org/aisc/publications/steel-construction-manual/aisc-shapes-database-v160/";
const positive = z.number().finite().positive();
const catalogSchema = z.object({
  format: z.literal("steel-saas-aisc-v1"),
  source: z.object({
    publisher: z.literal("AISC"), release: z.literal("16.0"),
    worksheet: z.literal("Database v16.0"), url: z.literal(aiscSourceUrl),
    workbookSha256: z.string().regex(/^[a-f0-9]{64}$/),
    unitSystem: z.literal("imperial"), material: z.literal("ASTM_A992_Fy50ksi"),
    totalRows: z.number().int().positive().max(10000),
    excludedNonWRows: z.number().int().nonnegative(),
  }).strict(),
  rows: z.array(z.object({
    AISC_Manual_Label: z.string().regex(/^W\d+(?:\.\d+)?X\d+(?:\.\d+)?$/i),
    W: positive, A: positive, d: positive, bf: positive, tw: positive, tf: positive,
    Sx: positive, Ix: positive, rx: positive, Sy: positive, Iy: positive, ry: positive,
    Zx: positive.optional(), J: positive.optional(), Cw: positive.optional(),
    rts: positive.optional(), ho: positive.optional(), kdes: positive.optional(),
    "h/tw": positive.optional(), "bf/2tf": positive.optional(),
  }).strict()).min(1).max(1000),
}).strict();

export function parseAiscCatalog(input: unknown): SteelSection[] {
  const { source, rows } = catalogSchema.parse(input);
  if (source.totalRows !== rows.length + source.excludedNonWRows) {
    throw new Error("AISC source row counts do not reconcile");
  }
  const seen = new Set<string>();
  const hasBeamProperties = rows.some(row => [row.Zx, row.J, row.Cw, row.rts, row.ho,
    row.kdes, row["h/tw"], row["bf/2tf"]].some(value => value !== undefined));
  return rows.map(row => {
    const designation = row.AISC_Manual_Label.toUpperCase().replace("X", "x");
    if (seen.has(designation)) throw new Error(`Duplicate AISC designation: ${designation}`);
    seen.add(designation);
    return {
      designation, standard: "AISC_360_22", unitSystem: "imperial", family: "W",
      sectionDbVersion: `aisc-16.0-us-a992-50ksi-${source.workbookSha256.slice(0, 12)}${hasBeamProperties ? "-beam-v1" : ""}`,
      area: row.A, weightOrMass: row.W, depth: row.d, flangeWidth: row.bf,
      webThickness: row.tw, flangeThickness: row.tf,
      sx: row.Sx, ix: row.Ix, rx: row.rx, sy: row.Sy, iy: row.Iy, ry: row.ry,
      fy: 50,
      ...(row.Zx === undefined ? {} : { zx: row.Zx }),
      ...(row.J === undefined ? {} : { j: row.J }),
      ...(row.Cw === undefined ? {} : { cw: row.Cw }),
      ...(row.rts === undefined ? {} : { rts: row.rts }),
      ...(row.ho === undefined ? {} : { ho: row.ho }),
      ...(row.kdes === undefined ? {} : { kdes: row.kdes }),
      ...(row["h/tw"] === undefined ? {} : { hOverTw: row["h/tw"] }),
      ...(row["bf/2tf"] === undefined ? {} : { bfOver2tf: row["bf/2tf"] }),
      sourceNote: `AISC Shapes Database v16.0; ${source.worksheet}; ${aiscSourceUrl}; workbook SHA256 ${source.workbookSha256}. US customary: in, in2, in3, in4, in6, lb/ft; h/tw and bf/2tf dimensionless. ASTM A992 Fy=50 ksi is an explicit material assumption, not a workbook property. Operator-supplied workbook; authenticity and data-use rights require independent verification.`,
    };
  });
}
