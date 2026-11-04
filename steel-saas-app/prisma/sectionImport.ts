import { sectionFixturesV1 } from "../src/domain/sections/sectionSeed.v1";
import type { SteelSection } from "../src/domain/sections/sectionTypes";

export const provenanceWarning = "Repository dataset; NOT independently verified. Some properties are geometry-derived; verify against authoritative CISC/AISC tables before engineering or paid use.";

export function parseImportArguments(args: string[]): boolean {
  return parseSectionImportOptions(args).apply;
}

export function parseSectionImportOptions(args: string[]): { apply: boolean; aiscCatalog?: string } {
  let aiscCatalog: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--aisc-catalog") {
      const path = args[++i];
      if (!path || path.startsWith("--") || aiscCatalog) throw new Error("Provide one --aisc-catalog path");
      aiscCatalog = path;
    } else if (!["--apply", "--acknowledge-provenance-limitations", "--confirm-data-use-rights"].includes(arg)) {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (args.includes("--apply") && !args.includes("--acknowledge-provenance-limitations")) {
    throw new Error("Writes require --acknowledge-provenance-limitations");
  }
  if (args.includes("--apply") && aiscCatalog && !args.includes("--confirm-data-use-rights")) {
    throw new Error("AISC writes require --confirm-data-use-rights after independent rights review");
  }
  return { apply: args.includes("--apply"), ...(aiscCatalog ? { aiscCatalog } : {}) };
}

type ExistingSection = Omit<SteelSection, "ry" | "fy" | "sy" | "iy" | "standard" | "family"> & {
  standard: string; family: string;
  ry?: number | null; fy?: number | null; sy?: number | null; iy?: number | null;
};
const identity = (s: ExistingSection) => JSON.stringify([s.standard, s.unitSystem, s.sectionDbVersion, s.designation]);

export function planSectionImport(existing: ExistingSection[], dataset?: SteelSection[]) {
  const create: SteelSection[] = [];
  let skipped = 0;
  const seen = new Set<string>();
  for (const source of dataset ?? sectionFixturesV1) {
    if (seen.has(identity(source))) throw new Error(`Duplicate input identity: ${source.designation}`);
    seen.add(identity(source));
    const row = { ...source, sourceNote: dataset ? source.sourceNote : `${source.sourceNote} ${provenanceWarning}` };
    const matches = existing.filter(s => identity(s) === identity(row));
    if (matches.length > 1) throw new Error(`Duplicate section identity: ${row.designation}`);
    if (matches.length === 0) {
      create.push(row);
      continue;
    }
    const match = matches[0];
    for (const key of Object.keys(source) as (keyof SteelSection)[]) {
      // Preserve original source notes on already-imported legacy rows.
      if (key === "sourceNote") continue;
      if ((match[key] ?? null) !== (source[key] ?? null)) {
        throw new Error(`Conflict: ${row.designation} ${key}; no data overwritten`);
      }
    }
    skipped++;
  }
  return { create, skipped };
}
