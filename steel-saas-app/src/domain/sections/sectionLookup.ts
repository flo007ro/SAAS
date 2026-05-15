import type { CodeProfile } from "../codeProfiles";
import type { UnitSystem } from "../units";
import type { SteelSection } from "./sectionTypes";

export type SectionSearch = {
  query?: string;
  standard?: CodeProfile;
  unitSystem?: UnitSystem;
  family?: "W";
};

export function findSections(
  sections: SteelSection[],
  search: SectionSearch,
): SteelSection[] {
  return sections
    .filter((s) => !search.standard || s.standard === search.standard)
    .filter((s) => !search.unitSystem || s.unitSystem === search.unitSystem)
    .filter((s) => !search.family || s.family === search.family)
    .filter((s) => {
      if (!search.query) return true;
      return s.designation.toLowerCase().includes(search.query.toLowerCase());
    })
    .sort((a, b) => a.weightOrMass - b.weightOrMass);
}

export function findLightestPassingSection(
  sections: SteelSection[],
  options: {
    standard: CodeProfile;
    unitSystem: UnitSystem;
    passes: (section: SteelSection) => boolean;
  },
): SteelSection | null {
  return (
    findSections(sections, {
      standard: options.standard,
      unitSystem: options.unitSystem,
      family: "W",
    }).find(options.passes) ?? null
  );
}
