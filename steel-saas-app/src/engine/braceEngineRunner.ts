import type { DesignRunRequest } from "../app/api/design-runs/schema";
import type { CodeProfile } from "../domain/codeProfiles";
import type { UnitSystem } from "../domain/units";
import { validateRunInput } from "./runInputValidation";
import { elasticModulus, csaS16FactoredResistance, aisc360FactoredResistance } from "./columnDesign";
import { ensureFiniteResult } from "./inputGuards";
import type { DesignResult } from "../domain/resultContract";

/**
 * W-shape member screening only. Connection, local/torsional buckling and
 * seismic system qualification are unassessed; never a complete brace design.
 */
export function runBraceEngine(runId: string,
  project: { codeProfile: CodeProfile; unitSystem: UnitSystem }, inputJson: unknown): DesignResult {
  const input = inputJson as DesignRunRequest["inputJson"];
  const s = validateRunInput("brace", project, input);
  const v = input.displayValues;
  const num = (key: string) => Number(v[key].value);
  const metric = project.unitSystem === "metric";
  const force = metric ? "kN" : "kip";
  const forceDivisor = metric ? 1000 : 1;
  const length = metric ? "mm" : "in";
  const tension = num("factoredTension"), compression = num("factoredCompression");
  const ag = s.area, an = num("netArea"), u = num("shearLagFactor"), fu = num("ultimateStrength");
  const ae = an * u;
  const yielding = .9 * ag * s.fy / forceDivisor;
  const rupture = .75 * ae * fu / forceDivisor;
  const tensionResistance = Math.min(yielding, rupture);
  const klrx = num("effectiveLengthX") / s.rx;
  const klry = num("effectiveLengthY") / s.ry;
  const klr = Math.max(klrx, klry);
  const fe = Math.PI ** 2 * elasticModulus(project.unitSystem) / klr ** 2;
  const resistance = project.codeProfile === "CSA_S16_19"
    ? csaS16FactoredResistance(ag, s.fy, fe).cr / forceDivisor
    : aisc360FactoredResistance(ag, s.fy, fe).phiPn / forceDivisor;
  const tensionSlenderness = num("memberLength") / Math.min(s.rx, s.ry);
  const tensionRatio = tension / tensionResistance, compressionRatio = compression / resistance;
  const tensionScreen = tension === 0 || tensionSlenderness <= num("tensionSlendernessLimit");
  const compressionScreen = compression === 0 || klr <= num("compressionSlendernessLimit");
  const seismic = v.seismicDemand.value === "seismic";
  const memberChecksMet = tensionRatio <= 1 && compressionRatio <= 1 && tensionScreen && compressionScreen;
  const round = (n: number) => Number(n.toFixed(4));
  const warnings = [
    "Member screening only: local and torsional buckling, connection/block shear, fatigue, eccentricity and combined bending are not evaluated. Section applicability requires engineering review.",
    "Net area and shear-lag factor are supplied by the engineer; hole deductions, U applicability and material certification are not verified by this module.",
    "Slenderness thresholds are project screening criteria, not a determination of code-required limits or exceptions.",
    seismic ? "SEISMIC REVIEW REQUIRED: cyclic brace behavior, expected strength, connection overstrength, compactness and system ductility are not evaluated. AISC 341 / applicable CSA seismic provisions require separate design."
      : "Seismic system qualification is outside this member screening module.",
  ];
  return ensureFiniteResult({
    runId, moduleType: "brace", engineVersion: "brace-member-0.1.0", sectionDbVersion: s.sectionDbVersion,
    codeProfile: project.codeProfile, unitSystem: project.unitSystem, demandMode: "user_factored_demands",
    displayInputSnapshot: v,
    normalizedInputs: { grossArea: ag, netArea: an, effectiveNetArea: ae, strongAxisKLr: klrx, weakAxisKLr: klry,
      tensionN: tension * (metric ? 1000 : 4448.2216152605), compressionN: compression * (metric ? 1000 : 4448.2216152605) },
    displayResults: {
      calculatedChecksMet: memberChecksMet, designStatus: "requires_engineering_review", grossYieldResistance: round(yielding), netRuptureResistance: round(rupture),
      tensionResistance: round(tensionResistance), compressionResistance: round(resistance), tensionDCR: round(tensionRatio), compressionDCR: round(compressionRatio),
      governingTensionCheck: yielding <= rupture ? "gross yielding" : "effective-net-area rupture", governingCompressionAxis: klrx >= klry ? "strong axis" : "weak axis",
      strongAxisKLr: round(klrx), weakAxisKLr: round(klry), tensionSlenderness: round(tensionSlenderness),
      tensionSlendernessScreenMet: tensionScreen, compressionSlendernessScreenMet: compressionScreen, seismicReviewRequired: seismic,
    },
    calculationLines: [
      "Scope: preliminary W-shape member checks only. No overall design approval is issued.",
      `Ag = ${ag}, An = ${an}, U = ${u}, Ae = U An = ${ae} ${metric ? "mm²" : "in²"}`,
      `Gross yielding resistance = 0.90 Ag Fy = ${round(yielding)} ${force}`,
      `Effective net-area rupture resistance = 0.75 Ae Fu = ${round(rupture)} ${force}`,
      `Tension resistance = min(yielding, rupture) = ${round(tensionResistance)} ${force}; tension DCR = ${round(tensionRatio)}`,
      `Kx Lx = ${num("effectiveLengthX")} ${length}; rx = ${s.rx} ${length}; Kx Lx / rx = ${round(klrx)}`,
      `Ky Ly = ${num("effectiveLengthY")} ${length}; ry = ${s.ry} ${length}; Ky Ly / ry = ${round(klry)}`,
      `Governing KL/r = ${round(klr)}; Fe = π²E/(KL/r)² = ${round(fe)} ${metric ? "MPa" : "ksi"}`,
      `Compression resistance (${project.codeProfile === "CSA_S16_19" ? "CSA n=1.34 curve" : "AISC E3 curve"}) = ${round(resistance)} ${force}; compression DCR = ${round(compressionRatio)}`,
      `Tension L/r = ${round(tensionSlenderness)}; project screening threshold = ${num("tensionSlendernessLimit")}`,
      `Compression KL/r project screening threshold = ${num("compressionSlendernessLimit")}`,
      "A zero demand marks that load sense as not applied; both demands cannot be zero. Tension and compression are separate envelope cases, not simultaneous forces.",
    ],
    warnings,
    codeReferences: project.codeProfile === "CSA_S16_19" ? ["CSA S16-19 Clause 13.2 — tension member resistance basis", "CSA S16-19 Clause 13.3.1 — flexural buckling curve"]
      : ["AISC 360-22 Section D2 — tensile strength", "AISC 360-22 Section E3 — flexural buckling"],
    sectionSnapshot: { designation: s.designation, A: s.area, d: s.depth, bf: s.flangeWidth, tf: s.flangeThickness, tw: s.webThickness,
      Sx: s.sx, rx: s.rx, ry: s.ry, Fy: s.fy, sectionDbVersion: s.sectionDbVersion },
  });
}
