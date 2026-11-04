import { parseAiscCatalog } from "./aiscCatalog";
import type { SteelSection } from "./sectionTypes";
import { withBothUnitSystems } from "./sectionUnits";

export function buildSectionCatalog(references: SteelSection[], activatedAisc: unknown): SteelSection[] {
  if (activatedAisc === null) return withBothUnitSystems(references);
  const aisc = parseAiscCatalog(activatedAisc);
  // One active AISC release/material policy avoids ambiguous designation lookups.
  return withBothUnitSystems([
    ...references.filter(s => s.standard !== "AISC_360_22"),
    ...aisc,
  ]);
}
