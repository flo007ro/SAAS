"use client";

import type { CodeProfile } from "../../domain/codeProfiles";
import type { UnitSystem } from "../../domain/units";
import { parseBeamAssessmentInput } from "../../domain/beamAssessmentInput";

function assessmentFields(unitSystem: UnitSystem, codeProfile: CodeProfile) {
  const metric = unitSystem === "metric";
  return [
    { key: "span", label: "Support-to-support span", unit: metric ? "mm" : "in" },
    { key: "unbracedLength", label: "Engineer-verified unbraced length", unit: metric ? "mm" : "in" },
    { key: "serviceDeadLoad", label: "Unfactored service dead UDL, including beam self-weight", unit: metric ? "kN/m" : "kip/ft" },
    { key: "serviceLiveLoad", label: "Unfactored service live UDL", unit: metric ? "kN/m" : "kip/ft" },
    { key: "materialYieldStrength", label: "Material yield strength Fy (engineer supplied)", unit: metric ? "MPa" : "ksi" },
    { key: "liveDeflectionLimit", label: "Live deflection limit denominator R in L/R (engineer supplied)", unit: "ratio" },
    { key: "totalDeflectionLimit", label: "Total deflection limit denominator R in L/R (engineer supplied)", unit: "ratio" },
    ...(codeProfile === "AISC_360_22" ? [{ key: "aiscCb", label: "AISC Cb (1 is a conservative assumption; engineer supplied if increased)", unit: "ratio" }] : []),
  ];
}

/** Assemble display entries only; the shared parser owns validity and SI conversion. */
export function buildBeamAssessmentDisplayValues(
  unitSystem: UnitSystem, codeProfile: CodeProfile, fields: Record<string, string>,
  loadConfirmed: boolean, restraintConfirmed: boolean,
) {
  if (!loadConfirmed) {
    throw new Error("Confirm the simply supported full-span service UDL model before assessment.");
  }
  const displayValues: Record<string, { label: string; value: string; unit: string }> = {
    supportModel: { label: "Support and loading model", value: "simply_supported_udl", unit: "category" },
    beamRestraint: { label: "Engineer restraint confirmation", value: restraintConfirmed ? "verified" : "unknown", unit: "category" },
  };
  for (const field of assessmentFields(unitSystem, codeProfile)) {
    if (field.key === "aiscCb" && !fields[field.key]?.trim()) continue;
    displayValues[field.key] = { label: field.label, value: fields[field.key] ?? "", unit: field.unit };
  }
  parseBeamAssessmentInput({ unitSystem, codeProfile, displayValues });
  return displayValues;
}

type Props = {
  unitSystem: UnitSystem;
  codeProfile: CodeProfile;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  fields: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
  loadConfirmed: boolean;
  onLoadConfirmedChange: (confirmed: boolean) => void;
  restraintConfirmed: boolean;
  onRestraintConfirmedChange: (confirmed: boolean) => void;
};

export default function BeamAssessmentFields(props: Props) {
  return <>
    <label className="beam-confirmation">
      <input name="assessSimplySupportedBeam" type="checkbox" checked={props.enabled} onChange={e => props.onEnabledChange(e.target.checked)} />
      Assess simply supported W-beam
    </label>
    {props.enabled ? <fieldset aria-label="Simply supported W-beam assessment">
      <legend>Partial W-beam member assessment</legend>
      <label>Support / loading category
        <select name="supportModel" value="simply_supported_udl" disabled>
          <option value="simply_supported_udl">Simply supported, full-span UDL (simply_supported_udl)</option>
        </select>
      </label>
      {assessmentFields(props.unitSystem, props.codeProfile).map(field => <label key={field.key}>
        {field.label} [{field.unit}]
        <input name={field.key} type="number" inputMode="decimal" required={field.key !== "aiscCb"} step="any"
          min={field.key === "aiscCb" ? "1" : "0"} max={field.key === "aiscCb" ? "3" : undefined}
          value={props.fields[field.key] ?? ""} onChange={e => props.onFieldChange(field.key, e.target.value)} />
      </label>)}
      <label className="beam-confirmation">
        <input name="beamLoadApplicabilityConfirmed" type="checkbox" required checked={props.loadConfirmed} onChange={e => props.onLoadConfirmedChange(e.target.checked)} />
        I confirm a prismatic simply supported W-beam with full-span downward UDL only; service loads are unfactored and dead load includes self-weight.
      </label>
      <label className="beam-confirmation">
        <input name="beamRestraintConfirmed" type="checkbox" checked={props.restraintConfirmed} onChange={e => props.onRestraintConfirmedChange(e.target.checked)} />
        I confirm a doubly symmetric rolled W-section in major-axis bending with no composite action; compression-flange lateral bracing at both ends of every Lb segment; torsional restraint at supports; and load through the shear center with no destabilizing eccentricity. I have verified that the supplied unbraced length Lb represents these braced segments.
      </label>
      {!props.restraintConfirmed && <p role="note">Restraints unknown: lateral-torsional buckling remains not checked. Serviceability assessment does not require this restraint affirmation.</p>}
      {props.codeProfile === "CSA_S16_19" && <p role="note">CSA classification and lateral-torsional buckling are awaiting primary-code validation and remain not checked.</p>}
      <p>Partial assessment only, not a complete beam design. Deflection assumes constant elastic stiffness and small displacements. Connections, vibration, shear deformation and other load/support cases are not assessed. Limits are project criteria supplied by the engineer.</p>
    </fieldset> : <p>Legacy flexure and shear checks only. Section classification, lateral-torsional buckling and deflection remain not checked.</p>}
  </>;
}
