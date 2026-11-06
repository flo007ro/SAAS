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
  // Native units: in^n or mm^n; ratios are dimensionless. Absent means unverified.
  zx?: number; // Plastic modulus, length^3.
  j?: number; // St Venant torsional constant, length^4.
  cw?: number; // Warping constant, length^6.
  rts?: number; // Effective LTB radius, length.
  ho?: number; // Flange centroid spacing, length.
  kdes?: number; // Flange outer face to web fillet toe, length.
  hOverTw?: number;
  bfOver2tf?: number;
  sourceNote: string;
};
