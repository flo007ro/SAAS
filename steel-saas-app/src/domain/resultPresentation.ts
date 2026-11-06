import { beamChecksSchema, type BeamChecks, type DesignResult, type SectionSnapshot } from "./resultContract";

export function beamSectionPropertyRows(section: SectionSnapshot, units: DesignResult["unitSystem"]) {
  const length = units === "metric" ? "mm" : "in";
  const powers = { Ix: 4, Iy: 4, Sy: 3, Zx: 3, J: 4, Cw: 6, rts: 1, ho: 1, kdes: 1, hOverTw: 0, bfOver2tf: 0 } as const;
  const rows: Array<{ label: string; value: string }> = (Object.keys(powers) as Array<keyof typeof powers>).flatMap(key => {
    const value = section[key];
    const power = powers[key];
    return value === undefined ? [] : [{ label: key, value: `${value}${power ? ` ${length}${power === 1 ? "" : `^${power}`}` : ""}` }];
  });
  if (section.E !== undefined) rows.push({ label: "E", value: `${section.E} ${units === "metric" ? "MPa" : "ksi"}` });
  if (section.sourceNote !== undefined) rows.push({ label: "Section property source", value: section.sourceNote });
  if (section.propertySourceNote !== undefined) rows.push({ label: "Property basis", value: section.propertySourceNote });
  return rows;
}

export const BEAM_CHECK_LABELS = {
  flexure: "Flexure",
  shear: "Shear",
  sectionClassification: "Section classification",
  lateralTorsionalBuckling: "Lateral-torsional buckling",
  deflection: "Deflection",
} as const;

export function beamServiceabilityRows(result: Pick<DesignResult, "displayResults" | "unitSystem">) {
  const display = result.displayResults;
  const unit = result.unitSystem === "metric" ? "mm" : "in";
  const divisor = result.unitSystem === "metric" ? 1 : 25.4;
  const lengths = [
    ["liveDeflection", "liveDeflectionMm", "Live-load deflection"],
    ["totalDeflection", "totalDeflectionMm", "Total-load deflection"],
    ["liveDeflectionLimit", "liveLimitMm", "Live-load allowable deflection"],
    ["totalDeflectionLimit", "totalLimitMm", "Total-load allowable deflection"],
  ];
  const rows = lengths.flatMap(([nativeKey, siKey, label]) => {
    const native = display[nativeKey];
    const si = display[siKey];
    const value = typeof native === "number" ? native : typeof si === "number" ? si / divisor : undefined;
    return value === undefined ? [] : [{ label, value: `${Number(value.toPrecision(8))} ${unit}` }];
  });
  for (const [key, label] of [["liveDCR", "Live-load deflection DCR"], ["totalDCR", "Total-load deflection DCR"]]) {
    if (typeof display[key] === "number") rows.push({ label, value: String(display[key]) });
  }
  return rows;
}

export function beamCheckRows(checks: BeamChecks) {
  return (Object.keys(BEAM_CHECK_LABELS) as Array<keyof BeamChecks>).map(key => ({
    key, label: BEAM_CHECK_LABELS[key], ...checks[key],
  }));
}

// Invalid modern snapshots must never fall back to a legacy passing boolean.
export function beamChecksVerdict(checks: unknown): string {
  if (checks && typeof checks === "object" && Object.values(checks).some(
    check => check && typeof check === "object" && "status" in check && check.status === "fail",
  )) return "Implemented checks fail";
  const parsed = beamChecksSchema.safeParse(checks);
  return parsed.success && beamCheckRows(parsed.data).every(check => check.status === "pass")
    ? "Implemented checks pass" : "Engineering review required";
}

export const RESULT_SCOPE: Partial<Record<DesignResult["moduleType"], string>> = {
  beam: "Scope: elastic major-axis flexure and simplified shear only; section classification, lateral-torsional buckling and deflection are not checked.",
  column: "Scope: weak-axis flexural buckling under axial compression only; local/torsional buckling and combined bending are not checked.",
  base_plate: "Scope: concentric compression bearing and required thickness only; supplied thickness, anchors, welds, uplift and moment are not checked.",
};

export function resultWarnings(moduleType: DesignResult["moduleType"], warnings: string[], beamChecks?: BeamChecks): string[] {
  if (moduleType === "beam" && beamChecks !== undefined) {
    const omissions = beamCheckRows(beamChecks).filter(check => check.status === "not_checked")
      .map(check => `${check.label} not checked: ${check.summary}`);
    return [...new Set([...warnings, ...omissions])];
  }
  const scope = RESULT_SCOPE[moduleType];
  return scope && !warnings.includes(scope) ? [...warnings, scope] : [...warnings];
}

export function demandLabel(key: string, codeProfile: string, fallback = key): string {
  const aisc = codeProfile === "AISC_360_22";
  switch (key) {
    case "factoredMoment": return `Factored moment, ${aisc ? "M_u" : "M_f"}`;
    case "factoredShear": return `Factored shear, ${aisc ? "V_u" : "V_f"}`;
    case "factoredCompression": return `Factored compression, ${aisc ? "P_u" : "C_f"}`;
    default: return fallback;
  }
}

export function implementedChecksVerdict(pass: unknown): string {
  return pass === true ? "Implemented checks pass" : "Implemented checks fail";
}
