import { parseBeamAssessmentInput } from "../domain/beamAssessmentInput";
import type { BeamChecks, DesignResult } from "../domain/resultContract";
import { RESULT_SCOPE, resultWarnings } from "../domain/resultPresentation";
import type { SteelSection } from "../domain/sections/sectionTypes";
import { calculateBeamServiceability } from "./beamServiceability";
import { EngineError } from "./engineError";
import { ensureFiniteResult } from "./inputGuards";
import { calculateAiscBeamStrength } from "./aiscBeamStrength";

type AssessmentRequest = {
  legacyResult: DesignResult;
  section: SteelSection;
  inputJson: unknown;
};
const omitted = (summary: string): BeamChecks["flexure"] => ({ status: "not_checked", summary });
const assessmentKeys = ["supportModel", "beamRestraint", "span", "unbracedLength", "serviceDeadLoad",
  "serviceLiveLoad", "liveDeflectionLimit", "totalDeflectionLimit", "materialYieldStrength", "aiscCb"];

/** Extends a fresh legacy calculation; never rewrites stored/historical results. */
export function calculateBeamAssessment({ legacyResult, section, inputJson }: AssessmentRequest): DesignResult {
  const result = structuredClone(legacyResult);
  result.engineVersion = "engine-0.2.0-beam-assessment";
  result.beamChecks = {
    flexure: omitted("Full major-axis flexure requires verified local-buckling and LTB resistance; the legacy elastic diagnostic is not a full flexure check."),
    shear: omitted("Legacy simplified shear assumes an unreduced web coefficient without establishing its applicability; it is an unverified diagnostic only."),
    sectionClassification: omitted("An explicit assessment input group and verified classification implementation are required."),
    lateralTorsionalBuckling: omitted("An explicit assessment input group, verified restraints and supported LTB properties are required."),
    deflection: omitted("An explicit simply-supported full-span service-load assessment input group is required."),
  };
  result.displayResults.pass = false;
  // The legacy numbers remain labelled diagnostics, never modern resistance values.
  result.displayResults.legacyElasticMomentCapacity = result.displayResults.designMomentCapacity;
  result.displayResults.legacyElasticMomentDCR = result.displayResults.momentDCR;
  result.displayResults.legacySimplifiedShearCapacity = result.displayResults.designShearCapacity;
  result.displayResults.legacySimplifiedShearDCR = result.displayResults.shearDCR;
  delete result.displayResults.designMomentCapacity;
  delete result.displayResults.momentDCR;
  delete result.displayResults.designShearCapacity;
  delete result.displayResults.shearDCR;
  result.displayResults.shearCapacityBasis = "Unverified legacy simplified shear diagnostic; not an assessment resistance check.";
  result.calculationLines = result.calculationLines.filter(line => line !== RESULT_SCOPE.beam);
  result.calculationLines = result.calculationLines.filter(line => !/M_r =|Moment DCR =/.test(line));
  result.calculationLines.push("Legacy elastic flexure and simplified shear values are diagnostics only, not verified modern resistance checks.");
  const baseWarnings = result.warnings.filter(warning => warning !== RESULT_SCOPE.beam);

  let assessment;
  try { assessment = parseBeamAssessmentInput(inputJson); }
  catch (error) { throw new EngineError("INVALID_INPUT", error instanceof Error ? error.message : "Invalid beam assessment inputs."); }
  if (assessment) {
    const metric = result.unitSystem === "metric";
    const inch = metric ? 1 : 25.4;
    const nativeStress = metric ? 1 : 6.894757293168361;
    const inertiaMm4 = section.ix * inch ** 4;
    const elasticModulusMPa = 200000;
    const displayValues = (inputJson as { displayValues: DesignResult["displayInputSnapshot"] }).displayValues;
    for (const key of assessmentKeys) {
      if (displayValues[key]) result.displayInputSnapshot[key] = structuredClone(displayValues[key]);
    }
    result.displayInputSnapshot.sectionPropertySource = { label: "Section property source", value: section.sourceNote, unit: "text" };
    result.displayInputSnapshot.assessmentPropertyBasis = {
      label: "Assessment property basis", unit: "text",
      value: "Ix and geometry from section database; Fy from user material input; E assumed 200000 MPa. Legacy diagnostic values use the original section database Fy, not assessment material Fy.",
    };
    result.displayInputSnapshot.referenceSectionYieldStrength = {
      label: "Reference section Fy (legacy diagnostics only)", value: section.fy, unit: metric ? "MPa" : "ksi",
    };
    Object.assign(result.normalizedInputs, {
      spanMm: assessment.spanMm, unbracedLengthMm: assessment.unbracedLengthMm,
      serviceDeadLoadNPerMm: assessment.serviceDeadLoadNPerMm, serviceLiveLoadNPerMm: assessment.serviceLiveLoadNPerMm,
      liveDeflectionLimit: assessment.liveDeflectionLimit, totalDeflectionLimit: assessment.totalDeflectionLimit,
      materialYieldStrengthMPa: assessment.materialYieldStrengthMPa, elasticModulusMPa, inertiaMm4,
      referenceSectionYieldStrengthMPa: section.fy * nativeStress,
    });
    if (assessment.aiscCb !== undefined) result.normalizedInputs.aiscCb = assessment.aiscCb;
    const sectionSnapshot = {
      ...result.sectionSnapshot!, Ix: section.ix,
      Fy: assessment.materialYieldStrengthMPa / nativeStress,
      E: elasticModulusMPa / nativeStress, sourceNote: section.sourceNote,
      propertySourceNote: result.displayInputSnapshot.assessmentPropertyBasis.value as string,
      ...(section.iy !== undefined ? { Iy: section.iy } : {}),
      ...(section.sy !== undefined ? { Sy: section.sy } : {}),
      ...(section.zx !== undefined ? { Zx: section.zx } : {}),
      ...(section.j !== undefined ? { J: section.j } : {}),
      ...(section.cw !== undefined ? { Cw: section.cw } : {}),
      ...(section.rts !== undefined ? { rts: section.rts } : {}),
      ...(section.ho !== undefined ? { ho: section.ho } : {}),
      ...(section.kdes !== undefined ? { kdes: section.kdes } : {}),
      ...(section.hOverTw !== undefined ? { hOverTw: section.hOverTw } : {}),
      ...(section.bfOver2tf !== undefined ? { bfOver2tf: section.bfOver2tf } : {}),
    };
    result.sectionSnapshot = sectionSnapshot;
    const deflection = calculateBeamServiceability({
      spanMm: assessment.spanMm, elasticModulusMPa, inertiaMm4,
      serviceDeadLoadNPerMm: assessment.serviceDeadLoadNPerMm, serviceLiveLoadNPerMm: assessment.serviceLiveLoadNPerMm,
      liveLimitRatio: assessment.liveDeflectionLimit, totalLimitRatio: assessment.totalDeflectionLimit,
    });
    result.beamChecks.deflection = {
      status: deflection.pass ? "pass" : "fail", ratio: Math.max(deflection.liveDCR, deflection.totalDCR),
      summary: `Simply supported full-span UDL: live ${deflection.liveDeflectionMm / inch} ${metric ? "mm" : "in"} / ${deflection.liveLimitMm / inch} ${metric ? "mm" : "in"} allowable; total ${deflection.totalDeflectionMm / inch} ${metric ? "mm" : "in"} / ${deflection.totalLimitMm / inch} ${metric ? "mm" : "in"} allowable. User-selected limits; E = ${elasticModulusMPa / nativeStress} ${metric ? "MPa" : "ksi"}.`,
    };
    Object.assign(result.displayResults, deflection);
    Object.assign(result.displayResults, {
      liveDeflection: deflection.liveDeflectionMm / inch, totalDeflection: deflection.totalDeflectionMm / inch,
      liveDeflectionLimit: deflection.liveLimitMm / inch, totalDeflectionLimit: deflection.totalLimitMm / inch,
      deflectionUnit: metric ? "mm" : "in",
    });
    result.calculationLines = result.calculationLines.filter(line => !/A_w =|V_r =|Shear DCR =/.test(line));
    result.calculationLines.push(
      ...assessmentKeys.filter(key => displayValues[key]).map(key => {
        const entry = displayValues[key]; return `${entry.label} = ${entry.value} ${entry.unit}`;
      }),
      `Serviceability only: delta = 5 w L^4 / (384 E Ix); E = ${elasticModulusMPa} MPa (assumed), Ix = ${inertiaMm4} mm^4.`,
      `SI deflection audit: live ${deflection.liveDeflectionMm} mm / ${deflection.liveLimitMm} mm allowable; total ${deflection.totalDeflectionMm} mm / ${deflection.totalLimitMm} mm allowable.`,
      "Service dead load must include self-weight where applicable; no automatic self-weight, load factors or camber are added.",
      result.beamChecks.deflection.summary,
    );
    result.codeReferences = ["BCSA Handbook of Structural Steelwork, publication 55/13, General Design Data: simply supported beam, full-span uniform load (elastic deflection only)."];
    result.beamChecks.sectionClassification = omitted(result.codeProfile === "CSA_S16_19"
      ? "CSA section classification awaits a verified primary reference and implementation."
      : "AISC section classification awaits verified strength module and required section properties.");
    result.beamChecks.lateralTorsionalBuckling = omitted(assessment.beamRestraint === "unknown"
      ? "Beam restraint is unknown; lateral-torsional buckling cannot be verified."
      : result.codeProfile === "CSA_S16_19" ? "CSA LTB awaits a verified primary reference and implementation."
        : "AISC LTB awaits verified strength module and required section properties.");
    if (result.codeProfile === "AISC_360_22") {
      const restraintVerified = assessment.beamRestraint === "verified";
      const strength = calculateAiscBeamStrength({
        section: {
          fyMPa: assessment.materialYieldStrengthMPa, sxMm3: section.sx * inch ** 3,
          zxMm3: section.zx === undefined ? undefined : section.zx * inch ** 3,
          iyMm4: section.iy === undefined ? undefined : section.iy * inch ** 4,
          ryMm: section.ry * inch,
          jMm4: section.j === undefined ? undefined : section.j * inch ** 4,
          cwMm6: section.cw === undefined ? undefined : section.cw * inch ** 6,
          rtsMm: section.rts === undefined ? undefined : section.rts * inch,
          hoMm: section.ho === undefined ? undefined : section.ho * inch,
          flangeSlenderness: section.bfOver2tf ?? section.flangeWidth / (2 * section.flangeThickness),
          webSlenderness: section.hOverTw ?? (section.kdes === undefined ? undefined : (section.depth - 2 * section.kdes) / section.webThickness),
        },
        lbMm: assessment.unbracedLengthMm, cb: assessment.aiscCb,
        applicability: {
          doublySymmetricRolledW: section.family === "W", majorAxisBending: true,
          torsionRestrainedEnds: restraintVerified, compressionFlangeBracedAtSegmentEnds: restraintVerified,
          loadThroughShearCenter: restraintVerified,
        },
      });
      result.normalizedInputs.aiscCb = assessment.aiscCb ?? 1;
      result.displayInputSnapshot.strengthApplicability = {
        label: "AISC strength applicability", unit: "text",
        value: restraintVerified
          ? "Explicit verified applicability affirmation: torsional end restraint, compression-flange bracing at segment ends and loading through the shear center. Doubly symmetric rolled W, major-axis bending only. Bracing design and destabilizing top-flange loading are excluded."
          : "Applicability is not verified: torsional end restraint, compression-flange segment-end bracing and shear-center loading have not been affirmed. LTB and full flexure are not checked.",
      };
      result.displayInputSnapshot.strengthPublicationBasis = {
        label: "Strength publication / release gate", unit: "text",
        value: `${strength.publicationBaseline}; errata review: ${strength.errataReview}.`,
      };
      const supportedClassification = ["compact", "noncompact"].includes(strength.classification.flange)
        && strength.classification.web === "compact";
      const classificationSummary = `AISC B4.1b published baseline: flange ${strength.classification.flange}, web ${strength.classification.web}. Noncompact/slender webs and slender flanges are outside supported strength scope.`;
      result.beamChecks.sectionClassification = supportedClassification
        ? { status: "pass", summary: classificationSummary } : omitted(classificationSummary);
      result.calculationLines.push(classificationSummary,
        `Cb = ${assessment.aiscCb ?? 1} (${assessment.aiscCb === undefined ? "conservative default within stated applicability" : "user supplied"}).`,
        result.displayInputSnapshot.strengthApplicability.value as string,
        ...strength.details);
      result.codeReferences.push(...strength.references);
      const publicationReview = strength.errataReview === "pending_independent_review"
        ? "Errata review pending independent review. Not production-approved."
        : `Errata review: ${strength.errataReview}.`;
      baseWarnings.push(`AISC strength uses ${strength.publicationBaseline}; ${publicationReview}`);
      if (strength.state === "checked") {
        const demandNmm = Number(result.displayInputSnapshot.factoredMoment.value) * (metric ? 1e6 : 1355817.9483314);
        const ratio = demandNmm / strength.designMomentNmm;
        const capacityNative = strength.designMomentNmm / (metric ? 1e6 : 1355817.9483314);
        const summary = `AISC published-baseline governing ${strength.governing}: phi Mn = ${capacityNative} ${metric ? "kN-m" : "kip-ft"}; demand/capacity = ${ratio}. ${publicationReview}`;
        result.normalizedInputs.factoredMomentNmm = demandNmm;
        Object.assign(result.displayResults, {
          designMomentCapacity: capacityNative,
          momentDCR: ratio, governingFlexuralLimitState: strength.governing,
          designMomentCapacityNmm: strength.designMomentNmm,
        });
        result.beamChecks.flexure = { status: ratio <= 1 ? "pass" : "fail", ratio, summary };
        const ltbRatio = demandNmm / strength.ltbDesignMomentNmm;
        result.beamChecks.lateralTorsionalBuckling = { status: ltbRatio <= 1 ? "pass" : "fail", ratio: ltbRatio,
          summary: `Explicitly verified restraint/load-path assessment: Lb=${assessment.unbracedLengthMm / inch} ${metric ? "mm" : "in"}, Lp=${strength.lpMm / inch} ${metric ? "mm" : "in"}, Lr=${strength.lrMm / inch} ${metric ? "mm" : "in"}; pre-local-buckling LTB resistance=${strength.ltbDesignMomentNmm / (metric ? 1e6 : 1355817.9483314)} ${metric ? "kN-m" : "kip-ft"}; demand/capacity=${ltbRatio}. ${publicationReview}` };
        Object.assign(result.displayResults, { ltbMomentCapacity: strength.ltbDesignMomentNmm / (metric ? 1e6 : 1355817.9483314), ltbDCR: ltbRatio });
        result.calculationLines.push(summary,
          `SI strength audit: governing phi Mn=${strength.designMomentNmm} N-mm; LTB phi Mn=${strength.ltbDesignMomentNmm} N-mm; demand=${demandNmm} N-mm; Lb=${assessment.unbracedLengthMm} mm, Lp=${strength.lpMm} mm, Lr=${strength.lrMm} mm.`);
      } else {
        const reason = strength.details.join(" ");
        result.beamChecks.flexure = omitted(reason);
        result.beamChecks.lateralTorsionalBuckling = omitted(restraintVerified ? reason : "Beam restraint is unknown; LTB and full flexure are not checked.");
      }
    }
  }
  // A serviceability-only pass must never overwrite the five-check verdict.
  result.displayResults.pass = Object.values(result.beamChecks).every(check => check.status === "pass");
  result.warnings = resultWarnings("beam", baseWarnings, result.beamChecks);
  return ensureFiniteResult(result);
}
