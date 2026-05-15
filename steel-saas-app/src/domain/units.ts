export type UnitSystem = "metric" | "imperial";

export type EngineeringUnit =
  | "kN"
  | "kN-m"
  | "mm"
  | "MPa"
  | "kip"
  | "kip-ft"
  | "in"
  | "ksi";

export type UnitValue = {
  value: number;
  unit: EngineeringUnit;
};
