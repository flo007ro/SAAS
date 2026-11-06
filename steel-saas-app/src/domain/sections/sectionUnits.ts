import type { UnitSystem } from "../units";
import type { SteelSection } from "./sectionTypes";

const mmPerInch = 25.4;
const mpaPerKsi = 6.894757293168361;
const kgPerMetrePerLbPerFoot = 0.45359237 / 0.3048;

export function convertSectionUnits(section: SteelSection, target: UnitSystem): SteelSection {
  if (section.unitSystem === target) return { ...section };
  const toMetric = target === "metric";
  const length = toMetric ? mmPerInch : 1 / mmPerInch;
  const stress = toMetric ? mpaPerKsi : 1 / mpaPerKsi;
  const weight = toMetric ? kgPerMetrePerLbPerFoot : 1 / kgPerMetrePerLbPerFoot;
  return {
    ...section, unitSystem: target,
    area: section.area * length ** 2,
    weightOrMass: section.weightOrMass * weight,
    depth: section.depth * length,
    flangeWidth: section.flangeWidth * length,
    webThickness: section.webThickness * length,
    flangeThickness: section.flangeThickness * length,
    sx: section.sx * length ** 3,
    ix: section.ix * length ** 4,
    rx: section.rx * length,
    ry: section.ry * length,
    fy: section.fy * stress,
    ...(section.sy === undefined ? {} : { sy: section.sy * length ** 3 }),
    ...(section.iy === undefined ? {} : { iy: section.iy * length ** 4 }),
    ...(section.zx === undefined ? {} : { zx: section.zx * length ** 3 }),
    ...(section.j === undefined ? {} : { j: section.j * length ** 4 }),
    ...(section.cw === undefined ? {} : { cw: section.cw * length ** 6 }),
    ...(section.rts === undefined ? {} : { rts: section.rts * length }),
    ...(section.ho === undefined ? {} : { ho: section.ho * length }),
    ...(section.kdes === undefined ? {} : { kdes: section.kdes * length }),
    sourceNote: `${section.sourceNote} Converted view: ${section.unitSystem} to ${target}; exact inch/mm and lb/ft-to-kg/m factors, dimension powers and ksi/MPa conversion. Original designation, standard and dataset version retained.`,
  };
}

export function withBothUnitSystems(sections: SteelSection[]): SteelSection[] {
  const key = (s: SteelSection, units = s.unitSystem) => JSON.stringify([s.standard, s.designation, units]);
  const present = new Set(sections.map(s => key(s)));
  const views = [...sections];
  for (const section of sections) {
    const target = section.unitSystem === "metric" ? "imperial" : "metric";
    if (!present.has(key(section, target))) {
      views.push(convertSectionUnits(section, target));
      present.add(key(section, target));
    }
  }
  return views;
}
