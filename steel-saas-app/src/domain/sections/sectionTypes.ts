import type { UnitSystem } from "../units";
import type { CodeProfile } from "../codeProfiles";

export type SteelSection = {
  designation: string;
  standard: CodeProfile;
  unitSystem: UnitSystem;
  sectionDbVersion: string;
  family: "W";
  area: number;
  weightOrMass: number;
  depth: number;
  flangeWidth: number;
  webThickness: number;
  flangeThickness: number;
  sx: number;
  ix: number;
  rx: number;
  ry: number;
  fy: number;
  sy?: number;
  iy?: number;
  sourceNote: string;
};
