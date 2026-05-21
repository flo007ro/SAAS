"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import MeshBackgroundAlt from "@/components/MeshBackgroundAlt";

const PAGE_BG = "#060c18";
const SURFACE = "rgba(6,12,24,0.9)";
const BORDER = "rgba(56,189,248,0.15)";
const ACCENT = "#38bdf8";
const TEXT = "#e0f2fe";
const MUTED = "rgba(148,163,184,0.65)";

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: "11px 14px",
  color: TEXT, fontSize: 14, outline: "none",
  width: "100%", fontFamily: "monospace", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  background: PAGE_BG,
  border: `1px solid rgba(56,189,248,0.28)`,
  borderRadius: 8, padding: "11px 14px",
  color: TEXT, fontSize: 14, outline: "none",
  width: "100%", fontFamily: "monospace", cursor: "pointer",
  boxSizing: "border-box", appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2338bdf8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 40,
};

const labelStyle: React.CSSProperties = {
  display: "block", color: MUTED, fontSize: 11,
  fontFamily: "monospace", letterSpacing: "0.07em", marginBottom: 6,
};

// Sections conditioned by UNIT SYSTEM
const SECTIONS_BY_UNIT: Record<string, { value: string; label: string }[]> = {
  imperial: [
    { value: "W12x40", label: "W12x40 — AISC imperial" },
    { value: "W10x33", label: "W10x33 — AISC imperial" },
    { value: "W14x48", label: "W14x48 — AISC imperial" },
  ],
  metric: [
    { value: "W310x60", label: "W310x60 — CSA metric" },
    { value: "W250x39", label: "W250x39 — CSA metric" },
    { value: "W360x79", label: "W360x79 — CSA metric" },
  ],
};

type ModuleType = "beam" | "column" | "basePlate" | "";

export default function NewRunPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const router = useRouter();

  const [type, setType] = useState<ModuleType>("");
  const [codeProfile, setCodeProfile] = useState("");
  const [unitSystem, setUnitSystem] = useState("");
  const [section, setSection] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const availableSections = unitSystem ? (SECTIONS_BY_UNIT[unitSystem] ?? []) : [];

  const mUnit = unitSystem === "metric" ? "kN·m" : "kip·ft";
  const vUnit = unitSystem === "metric" ? "kN" : "kips";
  const cUnit = unitSystem === "metric" ? "kN" : "kips";
  const lUnit = unitSystem === "metric" ? "mm" : "in";
  const fcUnit = unitSystem === "metric" ? "MPa" : "ksi";
  const dimUnit = unitSystem === "metric" ? "mm" : "in";

  const handleUnitChange = (u: string) => {
    setUnitSystem(u);
    setSection(""); // reset section when unit changes
  };

  const canSubmit = !loading && !!type && !!section && !!codeProfile && !!unitSystem;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!section) { setError("Please select a steel section."); return; }
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const getValue = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement)?.value ?? "";

    const displayValues: Record<string, unknown> = {
      selectedSection: { value: section, unit: "designation" },
      codeProfile: { value: codeProfile, unit: "code" },
      unitSystem: { value: unitSystem, unit: "system" },
    };

    if (type === "beam") {
      displayValues.factoredMoment = { value: parseFloat(getValue("factoredMoment")), unit: mUnit };
      displayValues.factoredShear = { value: parseFloat(getValue("factoredShear")), unit: vUnit };
    } else if (type === "column") {
      displayValues.factoredCompression = { value: parseFloat(getValue("factoredCompression")), unit: cUnit };
      displayValues.effectiveLength = { value: parseFloat(getValue("effectiveLength")), unit: lUnit };
    } else if (type === "basePlate") {
      displayValues.factoredCompression = { value: parseFloat(getValue("factoredCompression")), unit: cUnit };
      displayValues.plateN = { value: parseFloat(getValue("plateN")), unit: dimUnit };
      displayValues.plateB = { value: parseFloat(getValue("plateB")), unit: dimUnit };
      displayValues.concreteFC = { value: parseFloat(getValue("concreteFC")), unit: fcUnit };
      displayValues.plateFy = { value: parseFloat(getValue("plateFy")), unit: fcUnit };
    }

    const body = {
      type,
      projectId,
      title: getValue("title"),
      inputJson: { unitSystem, codeProfile, displayValues },
    };

    try {
      const res = await fetch("/api/design-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const runId = data.designRun?.id ?? data.id;
        if (runId) {
          router.push(`/projects/${projectId}/runs/${runId}`);
        } else {
          setError("Run created but ID missing — check project page.");
          setLoading(false);
        }
      } else {
        setError(data.message ?? data.error ?? `Error ${res.status} — check Vercel logs.`);
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, position: "relative" }}>
      <MeshBackgroundAlt />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 760, margin: "0 auto", padding: "52px 32px 80px" }}>

        <a href={`/projects/${projectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(56,189,248,0.5)", fontSize: 12, fontFamily: "monospace", textDecoration: "none", marginBottom: 32 }}>
          ← Back to project
        </a>

        <div style={{
          background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
          padding: "40px 48px", backdropFilter: "blur(20px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.5), transparent)" }} />

          <h1 style={{ fontSize: 24, fontWeight: 600, color: TEXT, margin: "0 0 5px", letterSpacing: "-0.01em" }}>New design run</h1>
          <p style={{ color: MUTED, fontSize: 13, fontFamily: "monospace", margin: "0 0 36px" }}>
            Select unit system first — section list updates automatically
          </p>

          {error && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 13, marginBottom: 24, fontFamily: "monospace", lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* Title */}
            <div>
              <label style={labelStyle}>RUN TITLE <span style={{ color: "#f87171" }}>*</span></label>
              <input name="title" required placeholder="e.g. B1 — Roof beam, gridline A" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.55)")}
                onBlur={e => (e.target.style.borderColor = BORDER)} />
            </div>

            {/* Module type */}
            <div>
              <label style={labelStyle}>MODULE TYPE <span style={{ color: "#f87171" }}>*</span></label>
              <select name="type" required value={type}
                onChange={e => setType(e.target.value as ModuleType)}
                style={selectStyle}>
                <option value="" disabled style={{ background: PAGE_BG }}>Select module...</option>
                <option value="beam" style={{ background: PAGE_BG }}>⌇  Beam design</option>
                <option value="column" style={{ background: PAGE_BG }}>▮  Column design</option>
                <option value="basePlate" style={{ background: PAGE_BG }}>▬  Axial base plate</option>
              </select>
            </div>

            {/* Unit system — first, drives sections */}
            <div>
              <label style={labelStyle}>
                UNIT SYSTEM <span style={{ color: "#f87171" }}>*</span>
                <span style={{ color: "rgba(56,189,248,0.4)", marginLeft: 8, fontWeight: 400 }}>— sets available sections</span>
              </label>
              <select name="unitSystem" required value={unitSystem}
                onChange={e => handleUnitChange(e.target.value)}
                style={selectStyle}>
                <option value="" disabled style={{ background: PAGE_BG }}>Select unit system...</option>
                <option value="imperial" style={{ background: PAGE_BG }}>Imperial — kip, ft, in  →  AISC sections</option>
                <option value="metric" style={{ background: PAGE_BG }}>Metric — kN, m, mm  →  CSA sections</option>
              </select>
            </div>

            {/* Design code */}
            <div>
              <label style={labelStyle}>DESIGN CODE <span style={{ color: "#f87171" }}>*</span></label>
              <select name="codeProfile" required value={codeProfile}
                onChange={e => setCodeProfile(e.target.value)}
                style={selectStyle}>
                <option value="" disabled style={{ background: PAGE_BG }}>Select code profile...</option>
                <option value="AISC_360_22" style={{ background: PAGE_BG }}>AISC 360-22 (US)</option>
                <option value="CSA_S16_19" style={{ background: PAGE_BG }}>CSA S16-19 (Canada)</option>
              </select>
            </div>

            {/* Steel section — dropdown conditioned by unit system */}
            {type && unitSystem && (
              <div>
                <label style={labelStyle}>
                  STEEL SECTION <span style={{ color: "#f87171" }}>*</span>
                  <span style={{ color: "rgba(56,189,248,0.4)", marginLeft: 8, fontWeight: 400 }}>
                    {unitSystem === "imperial" ? "AISC imperial sections" : "CSA metric sections"}
                  </span>
                </label>
                <select
                  required
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  style={{ ...selectStyle, color: section ? TEXT : MUTED }}
                >
                  <option value="" disabled style={{ background: PAGE_BG, color: MUTED }}>
                    Select {unitSystem === "imperial" ? "AISC" : "CSA"} section...
                  </option>
                  {availableSections.map(s => (
                    <option key={s.value} value={s.value} style={{ background: PAGE_BG, color: TEXT }}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {section && (
                  <div style={{ marginTop: 6, fontSize: 11, color: "rgba(56,189,248,0.6)", fontFamily: "monospace" }}>
                    ✓ Selected: <strong style={{ color: ACCENT }}>{section}</strong>
                    <button type="button" onClick={() => setSection("")}
                      style={{ background: "transparent", border: "none", color: "rgba(148,163,184,0.4)", fontSize: 11, fontFamily: "monospace", cursor: "pointer", marginLeft: 10 }}>
                      clear
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Factored demands */}
            {type && unitSystem && (
              <div style={{ borderTop: "1px solid rgba(56,189,248,0.1)", paddingTop: 24 }}>
                <div style={{ fontSize: 11, color: "rgba(56,189,248,0.55)", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 22 }}>
                  FACTORED DEMANDS — enter pre-factored values only
                </div>

                {type === "beam" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div>
                      <label style={labelStyle}>FACTORED MOMENT M_f [{mUnit}] <span style={{ color: "#f87171" }}>*</span></label>
                      <input name="factoredMoment" type="number" step="any" min="0" required placeholder="0.0" style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.55)")}
                        onBlur={e => (e.target.style.borderColor = BORDER)} />
                    </div>
                    <div>
                      <label style={labelStyle}>FACTORED SHEAR V_f [{vUnit}] <span style={{ color: "#f87171" }}>*</span></label>
                      <input name="factoredShear" type="number" step="any" min="0" required placeholder="0.0" style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.55)")}
                        onBlur={e => (e.target.style.borderColor = BORDER)} />
                    </div>
                  </div>
                )}

                {type === "column" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div>
                      <label style={labelStyle}>FACTORED COMPRESSION C_f [{cUnit}] <span style={{ color: "#f87171" }}>*</span></label>
                      <input name="factoredCompression" type="number" step="any" min="0" required placeholder="0.0" style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.55)")}
                        onBlur={e => (e.target.style.borderColor = BORDER)} />
                    </div>
                    <div>
                      <label style={labelStyle}>EFFECTIVE LENGTH KL [{lUnit}] <span style={{ color: "#f87171" }}>*</span></label>
                      <input name="effectiveLength" type="number" step="any" min="0" required placeholder="0.0" style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.55)")}
                        onBlur={e => (e.target.style.borderColor = BORDER)} />
                    </div>
                  </div>
                )}

                {type === "basePlate" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div>
                      <label style={labelStyle}>FACTORED COMPRESSION P_u [{cUnit}] <span style={{ color: "#f87171" }}>*</span></label>
                      <input name="factoredCompression" type="number" step="any" min="0" required placeholder="0.0" style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.55)")}
                        onBlur={e => (e.target.style.borderColor = BORDER)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                      <div>
                        <label style={labelStyle}>PLATE LENGTH N [{dimUnit}] <span style={{ color: "#f87171" }}>*</span></label>
                        <input name="plateN" type="number" step="any" min="0" required placeholder="0.0" style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.55)")}
                          onBlur={e => (e.target.style.borderColor = BORDER)} />
                      </div>
                      <div>
                        <label style={labelStyle}>PLATE WIDTH B [{dimUnit}] <span style={{ color: "#f87171" }}>*</span></label>
                        <input name="plateB" type="number" step="any" min="0" required placeholder="0.0" style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.55)")}
                          onBlur={e => (e.target.style.borderColor = BORDER)} />
                      </div>
                      <div>
                        <label style={labelStyle}>CONCRETE f_c [{fcUnit}] <span style={{ color: "#f87171" }}>*</span></label>
                        <input name="concreteFC" type="number" step="any" min="0" required
                          placeholder={unitSystem === "metric" ? "28" : "4"} style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.55)")}
                          onBlur={e => (e.target.style.borderColor = BORDER)} />
                      </div>
                      <div>
                        <label style={labelStyle}>PLATE F_y [{fcUnit}]</label>
                        <input name="plateFy" type="number" step="any"
                          defaultValue={unitSystem === "metric" ? "250" : "36"} style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.55)")}
                          onBlur={e => (e.target.style.borderColor = BORDER)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 16, paddingTop: 8 }}>
              <a href={`/projects/${projectId}`} style={{
                flex: 1, background: "transparent", border: "1px solid rgba(56,189,248,0.15)",
                borderRadius: 9, padding: "13px 0", color: MUTED,
                fontSize: 13, fontFamily: "monospace", textDecoration: "none",
                textAlign: "center", letterSpacing: "0.07em",
              }}>CANCEL</a>
              <button type="submit" disabled={!canSubmit} style={{
                flex: 2,
                background: canSubmit ? "linear-gradient(135deg, rgba(56,189,248,0.22), rgba(56,189,248,0.09))" : "rgba(56,189,248,0.04)",
                border: `1px solid rgba(56,189,248,${canSubmit ? "0.45" : "0.12"})`,
                borderRadius: 9, padding: "13px 0",
                color: canSubmit ? ACCENT : "rgba(56,189,248,0.3)",
                fontSize: 13, fontWeight: 600, fontFamily: "monospace",
                letterSpacing: "0.1em", cursor: canSubmit ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}>
                {loading ? "CALCULATING..." : "RUN CALCULATION →"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
