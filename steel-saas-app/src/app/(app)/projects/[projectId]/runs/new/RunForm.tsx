"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FactoredDemandField } from "../../../../../../components/forms/FactoredDemandField";
import { SectionSearch } from "../../../../../../components/forms/SectionSearch";
import { createRunAction, type RunFormState } from "./actions";
import type { EngineeringUnit } from "../../../../../../domain/units";

type Props = {
  projectId: string;
  projectName: string;
  unitSystem: "metric" | "imperial";
  codeProfile: string;
  availableSections: string[];
};

type FieldValues = {
  title: string;
  type: "" | "beam" | "column" | "base_plate";
  factoredMoment: string;
  factoredShear: string;
  factoredCompression: string;
  effectiveLength: string;
  plateN: string;
  plateB: string;
  concreteStrength: string;
  plateFy: string;
  selectedSection: string;
};

const TYPE_LABELS: Record<string, string> = {
  beam: "Beam flexure",
  column: "Column axial compression",
  base_plate: "Base plate bearing",
};

export default function RunForm({
  projectId, projectName, unitSystem, codeProfile, availableSections,
}: Props) {
  const [state, formAction, pending] = useActionState<RunFormState, FormData>(
    createRunAction,
    null,
  );

  const [fields, setFields] = useState<FieldValues>({
    title: "",
    type: "",
    factoredMoment: "",
    factoredShear: "",
    factoredCompression: "",
    effectiveLength: "",
    plateN: "",
    plateB: "",
    concreteStrength: "",
    plateFy: unitSystem === "metric" ? "250" : "36",
    selectedSection: "",
  });

  const set = (key: keyof FieldValues) => (val: string) =>
    setFields((prev) => ({ ...prev, [key]: val }));

  const us = unitSystem;
  const momentUnit: EngineeringUnit = us === "metric" ? "kN-m"   : "kip-ft";
  const forceUnit:  EngineeringUnit = us === "metric" ? "kN"     : "kip";
  const lengthUnit: EngineeringUnit = us === "metric" ? "mm"     : "in";
  const pressUnit:  EngineeringUnit = us === "metric" ? "MPa"    : "ksi";

  const momentLabel = us === "metric" ? "Factored moment, M_f"      : "Factored moment, M_u";
  const shearLabel  = us === "metric" ? "Factored shear, V_f"       : "Factored shear, V_u";
  const compLabel   = us === "metric" ? "Factored compression, C_f" : "Factored compression, P_u";

  return (
    <>
      {/* Styles for FactoredDemandField (.field / .inputWithUnit) and SectionSearch */}
      <style>{`
        .field { margin-bottom: 1.25rem; }
        .field > span { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
        .inputWithUnit { display: flex; }
        .inputWithUnit input { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-right: none; border-radius: 4px 0 0 4px; font-size: 1rem; }
        .inputWithUnit > span { padding: 0.5rem 0.75rem; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 0 4px 4px 0; font-size: 0.875rem; color: #6b7280; white-space: nowrap; display: flex; align-items: center; }
        .section-wrap section { margin-bottom: 1.25rem; }
        .section-wrap section > label > span { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
        .section-wrap section > label > input { display: block; width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 1rem; box-sizing: border-box; margin-bottom: 0.375rem; }
        .section-wrap section > button { padding: 0.375rem 0.75rem; font-size: 0.8125rem; border: 1px solid #d1d5db; border-radius: 4px; background: #f3f4f6; cursor: pointer; color: #374151; }
      `}</style>

      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
        <Link
          href={`/projects/${projectId}`}
          style={{ display: "inline-block", marginBottom: "1.25rem", fontSize: "0.875rem", color: "#6b7280", textDecoration: "none" }}
        >
          ← {projectName}
        </Link>
        <h1 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
          New design run
        </h1>

        {state?.error && (
          <p role="alert" style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: "4px", padding: "0.625rem 0.75rem", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            {state.error}
          </p>
        )}

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1.75rem" }}>
          <form action={formAction}>
            {/* Hidden project/unit context */}
            <input type="hidden" name="projectId"   value={projectId} />
            <input type="hidden" name="unitSystem"  value={unitSystem} />
            <input type="hidden" name="codeProfile" value={codeProfile} />

            {/* ── Step 1: Title + type ──────────────────────────── */}
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>
              Run title <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              name="title" type="text" required placeholder="e.g. Roof beam B1"
              value={fields.title} onChange={(e) => set("title")(e.target.value)}
              style={{ display: "block", width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "1rem", marginBottom: "1.25rem", boxSizing: "border-box" }}
            />

            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>
              Run type <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              name="type" required defaultValue=""
              onChange={(e) => set("type")(e.target.value as FieldValues["type"])}
              style={{ display: "block", width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "1rem", background: "#fff", marginBottom: "1.5rem", boxSizing: "border-box" }}
            >
              <option value="" disabled>Select type…</option>
              <option value="beam">Beam — flexure + shear</option>
              <option value="column">Column — axial compression</option>
              <option value="base_plate">Base plate — bearing + thickness</option>
            </select>

            {/* ── Step 2: Type-specific inputs ─────────────────── */}
            {fields.type && (
              <>
                <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 1.5rem" }} />
                <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.25rem" }}>
                  {TYPE_LABELS[fields.type]} · {unitSystem} · {codeProfile.replace("_", " ")}
                </p>

                {/* ── Beam ── */}
                {fields.type === "beam" && (
                  <>
                    <FactoredDemandField id="factoredMoment" label={momentLabel} unit={momentUnit} value={fields.factoredMoment} onChange={set("factoredMoment")} />
                    <FactoredDemandField id="factoredShear"  label={shearLabel}  unit={forceUnit}  value={fields.factoredShear}  onChange={set("factoredShear")} />
                  </>
                )}

                {/* ── Column ── */}
                {fields.type === "column" && (
                  <>
                    <FactoredDemandField id="factoredCompression" label={compLabel}   unit={forceUnit}  value={fields.factoredCompression} onChange={set("factoredCompression")} />
                    <PlainField id="effectiveLength" label={`Effective length, KL (${lengthUnit})`} value={fields.effectiveLength} onChange={set("effectiveLength")} />
                  </>
                )}

                {/* ── Base plate ── */}
                {fields.type === "base_plate" && (
                  <>
                    <FactoredDemandField id="factoredCompression" label={compLabel} unit={forceUnit} value={fields.factoredCompression} onChange={set("factoredCompression")} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <PlainField id="plateN" label={`Plate N (${lengthUnit})`} value={fields.plateN} onChange={set("plateN")} />
                      <PlainField id="plateB" label={`Plate B (${lengthUnit})`} value={fields.plateB} onChange={set("plateB")} />
                    </div>
                    <PlainField id="concreteStrength" label={`Concrete f'c (${pressUnit})`} value={fields.concreteStrength} onChange={set("concreteStrength")} />
                    <PlainField id="plateFy" label={`Plate F_y (${pressUnit})`} value={fields.plateFy} onChange={set("plateFy")} />
                  </>
                )}

                {/* ── Section (all types) ── */}
                <div className="section-wrap">
                  <SectionSearch
                    label={fields.type === "base_plate" ? "Column section (for d and b_f)" : "Steel section"}
                    value={fields.selectedSection}
                    onChange={set("selectedSection")}
                    onSuggestLightestPassing={() => set("selectedSection")(availableSections[0] ?? "")}
                  />
                </div>
                {/* Hidden input so the value is in FormData */}
                <input type="hidden" name="selectedSection" value={fields.selectedSection} />
                <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "-0.75rem", marginBottom: "1.25rem" }}>
                  Available: {availableSections.join(", ")}
                </p>
              </>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <Link
                href={`/projects/${projectId}`}
                style={{ padding: "0.5rem 1rem", color: "#374151", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "0.875rem", textDecoration: "none" }}
              >
                Cancel
              </Link>
              <button
                type="submit" disabled={pending || !fields.type}
                style={{ padding: "0.5rem 1.25rem", background: pending || !fields.type ? "#93c5fd" : "#1d4ed8", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.875rem", fontWeight: 600, cursor: pending || !fields.type ? "not-allowed" : "pointer" }}
              >
                {pending ? "Running…" : "Run calculation"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

// Plain numeric input used for non-factored fields
function PlainField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label htmlFor={id} style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" }}>
        {label}
      </label>
      <input
        id={id} name={id} type="number" inputMode="decimal" step="any"
        value={value} onChange={(e) => onChange(e.target.value)}
        style={{ display: "block", width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "1rem", boxSizing: "border-box" }}
      />
    </div>
  );
}
