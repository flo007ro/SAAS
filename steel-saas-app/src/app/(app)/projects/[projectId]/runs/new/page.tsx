"use client";
import { use } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import MeshBackgroundAlt from "@/components/MeshBackgroundAlt";

const PAGE_BG = "#060c18";
const SURFACE = "rgba(6,12,24,0.88)";
const BORDER = "rgba(56,189,248,0.15)";
const ACCENT = "#38bdf8";
const TEXT = "#e0f2fe";
const MUTED = "rgba(148,163,184,0.65)";

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "11px 14px",
  color: TEXT,
  fontSize: 14,
  outline: "none",
  width: "100%",
  fontFamily: "monospace",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  background: PAGE_BG,
  border: `1px solid rgba(56,189,248,0.25)`,
  borderRadius: 8,
  padding: "11px 14px",
  color: TEXT,
  fontSize: 14,
  outline: "none",
  width: "100%",
  fontFamily: "monospace",
  cursor: "pointer",
  boxSizing: "border-box",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2338bdf8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  paddingRight: 40,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: MUTED,
  fontSize: 11,
  fontFamily: "monospace",
  letterSpacing: "0.07em",
  marginBottom: 6,
};

const SECTIONS_AISC = ["W12x40", "W10x33", "W14x48"];
const SECTIONS_CSA = ["W310x60", "W250x39", "W360x79"];

type ModuleType = "beam" | "column" | "basePlate" | "";

export default function NewRunPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const [type, setType] = useState<ModuleType>("");
  const [codeProfile, setCodeProfile] = useState("");
  const [unitSystem, setUnitSystem] = useState("");
  const [section, setSection] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sections = codeProfile === "CSA_S16_19" ? SECTIONS_CSA : SECTIONS_AISC;
  const filtered = sections.filter((s) =>
    s.toLowerCase().includes(sectionSearch.toLowerCase())
  );

  const mUnit = unitSystem === "metric" ? "kN·m" : "kip·ft";
  const vUnit = unitSystem === "metric" ? "kN" : "kips";
  const cUnit = unitSystem === "metric" ? "kN" : "kips";
  const lUnit = unitSystem === "metric" ? "mm" : "in";
  const fcUnit = unitSystem === "metric" ? "MPa" : "ksi";
  const dimUnit = unitSystem === "metric" ? "mm" : "in";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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

    const res = await fetch("/api/design-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const run = await res.json();
      router.push(`/projects/${projectId}/runs/${run.designRun?.id ?? run.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Calculation failed.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, position: "relative" }}>
      <MeshBackgroundAlt />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 720, margin: "0 auto", padding: "52px 32px 80px" }}>

        <a href={`/projects/${projectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(56,189,248,0.5)", fontSize: 12, fontFamily: "monospace", textDecoration: "none", marginBottom: 32 }}>
          ← Back to project
        </a>

        <div style={{
          background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
          padding: "40px 44px", backdropFilter: "blur(20px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.5), transparent)" }} />

          <h1 style={{ fontSize: 24, fontWeight: 600, color: TEXT, margin: "0 0 6px", letterSpacing: "-0.01em" }}>New design run</h1>
          <p style={{ color: MUTED, fontSize: 13, fontFamily: "monospace", margin: "0 0 36px" }}>Select module type and enter factored demands</p>

          {error && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: "11px 16px", color: "#f87171", fontSize: 13, marginBottom: 24, fontFamily: "monospace" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            <div>
              <label style={labelStyle}>RUN TITLE <span style={{ color: "#f87171" }}>*</span></label>
              <input name="title" required placeholder="e.g. B1 — Roof beam, gridline A" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
                onBlur={e => (e.target.style.borderColor = BORDER)} />
            </div>

            <div>
              <label style={labelStyle}>MODULE TYPE <span style={{ color: "#f87171" }}>*</span></label>
              <select name="type" required value={type}
                onChange={e => { setType(e.target.value as ModuleType); setSection(""); }}
                style={selectStyle}>
                <option value="" disabled style={{ background: PAGE_BG, color: MUTED }}>Select module...</option>
                <option value="beam" style={{ background: PAGE_BG, color: TEXT }}>Beam design</option>
                <option value="column" style={{ background: PAGE_BG, color: TEXT }}>Column design</option>
                <option value="basePlate" style={{ background: PAGE_BG, color: TEXT }}>Axial base plate</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <label style={labelStyle}>DESIGN CODE <span style={{ color: "#f87171" }}>*</span></label>
                <select name="codeProfile" required value={codeProfile}
                  onChange={e => setCodeProfile(e.target.value)} style={selectStyle}>
                  <option value="" disabled style={{ background: PAGE_BG, color: MUTED }}>Select code...</option>
                  <option value="AISC_360_22" style={{ background: PAGE_BG, color: TEXT }}>AISC 360-22</option>
                  <option value="CSA_S16_19" style={{ background: PAGE_BG, color: TEXT }}>CSA S16-19</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>UNIT SYSTEM <span style={{ color: "#f87171" }}>*</span></label>
                <select name="unitSystem" required value={unitSystem}
                  onChange={e => setUnitSystem(e.target.value)} style={selectStyle}>
                  <option value="" disabled style={{ background: PAGE_BG, color: MUTED }}>Select units...</option>
                  <option value="imperial" style={{ background: PAGE_BG, color: TEXT }}>Imperial (kip, ft, in)</option>
                  <option value="metric" style={{ background: PAGE_BG, color: TEXT }}>Metric (kN, m, mm)</option>
                </select>
              </div>
            </div>

            {type && (
              <div>
                <label style={labelStyle}>STEEL SECTION <span style={{ color: "#f87171" }}>*</span></label>
                <input
                  placeholder="Search section e.g. W310, W12..."
                  value={sectionSearch}
                  onChange={e => setSectionSearch(e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
                  onBlur={e => (e.target.style.borderColor = BORDER)}
                />
                {sectionSearch && (
                  <div style={{ marginTop: 6, background: PAGE_BG, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
                    {filtered.length === 0 && (
                      <div style={{ padding: "10px 14px", color: MUTED, fontSize: 13, fontFamily: "monospace" }}>No sections found</div>
                    )}
                    {filtered.map(s => (
                      <button key={s} type="button"
                        onClick={() => { setSection(s); setSectionSearch(s); }}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "10px 14px", background: section === s ? "rgba(56,189,248,0.1)" : "transparent",
                          border: "none", color: section === s ? ACCENT : TEXT,
                          fontSize: 13, fontFamily: "monospace", cursor: "pointer",
                          borderBottom: "1px solid rgba(56,189,248,0.06)",
                        }}>{s}</button>
                    ))}
                  </div>
                )}
                {section && (
                  <div style={{ marginTop: 6, fontSize: 11, color: "rgba(56,189,248,0.6)", fontFamily: "monospace" }}>
                    Selected: <strong style={{ color: ACCENT }}>{section}</strong>
                    <button type="button" onClick={() => { setSection(""); setSectionSearch(""); }}
                      style={{ background: "transparent", border: "none", color: MUTED, fontSize: 11, cursor: "pointer", fontFamily: "monospace", marginLeft: 10 }}>clear</button>
                  </div>
                )}
              </div>
            )}

            {type && (
              <div style={{ borderTop: "1px solid rgba(56,189,248,0.08)", paddingTop: 20 }}>
                <div style={{ fontSize: 11, color: "rgba(56,189,248,0.5)", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 20 }}>
                  FACTORED DEMANDS — enter factored values only
                </div>

                {type === "beam" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div>
                      <label style={labelStyle}>FACTORED MOMENT M_f [{mUnit || "—"}] <span style={{ color: "#f87171" }}>*</span></label>
                      <input name="factoredMoment" type="number" step="any" required placeholder="0.0" style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
                        onBlur={e => (e.target.style.borderColor = BORDER)} />
                    </div>
                    <div>
                      <label style={labelStyle}>FACTORED SHEAR V_f [{vUnit || "—"}] <span style={{ color: "#f87171" }}>*</span></label>
                      <input name="factoredShear" type="number" step="any" required placeholder="0.0" style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
                        onBlur={e => (e.target.style.borderColor = BORDER)} />
                    </div>
                  </div>
                )}

                {type === "column" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div>
                      <label style={labelStyle}>FACTORED COMPRESSION C_f [{cUnit || "—"}] <span style={{ color: "#f87171" }}>*</span></label>
                      <input name="factoredCompression" type="number" step="any" required placeholder="0.0" style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
                        onBlur={e => (e.target.style.borderColor = BORDER)} />
                    </div>
                    <div>
                      <label style={labelStyle}>EFFECTIVE LENGTH KL [{lUnit || "—"}] <span style={{ color: "#f87171" }}>*</span></label>
                      <input name="effectiveLength" type="number" step="any" required placeholder="0.0" style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
                        onBlur={e => (e.target.style.borderColor = BORDER)} />
                    </div>
                  </div>
                )}

                {type === "basePlate" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div>
                      <label style={labelStyle}>FACTORED COMPRESSION P_u [{cUnit || "—"}] <span style={{ color: "#f87171" }}>*</span></label>
                      <input name="factoredCompression" type="number" step="any" required placeholder="0.0" style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
                        onBlur={e => (e.target.style.borderColor = BORDER)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div>
                        <label style={labelStyle}>PLATE LENGTH N [{dimUnit || "—"}] <span style={{ color: "#f87171" }}>*</span></label>
                        <input name="plateN" type="number" step="any" required placeholder="0.0" style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
                          onBlur={e => (e.target.style.borderColor = BORDER)} />
                      </div>
                      <div>
                        <label style={labelStyle}>PLATE WIDTH B [{dimUnit || "—"}] <span style={{ color: "#f87171" }}>*</span></label>
                        <input name="plateB" type="number" step="any" required placeholder="0.0" style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
                          onBlur={e => (e.target.style.borderColor = BORDER)} />
                      </div>
                      <div>
                        <label style={labelStyle}>CONCRETE f_c [{fcUnit || "—"}] <span style={{ color: "#f87171" }}>*</span></label>
                        <input name="concreteFC" type="number" step="any" required
                          placeholder={unitSystem === "metric" ? "28" : "4"} style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
                          onBlur={e => (e.target.style.borderColor = BORDER)} />
                      </div>
                      <div>
                        <label style={labelStyle}>PLATE F_y [{fcUnit || "—"}]</label>
                        <input name="plateFy" type="number" step="any"
                          defaultValue={unitSystem === "metric" ? "250" : "36"} style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
                          onBlur={e => (e.target.style.borderColor = BORDER)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
              <a href={`/projects/${projectId}`} style={{
                flex: 1, background: "transparent", border: "1px solid rgba(56,189,248,0.15)",
                borderRadius: 9, padding: "12px 0", color: MUTED,
                fontSize: 13, fontFamily: "monospace", textDecoration: "none",
                textAlign: "center", letterSpacing: "0.07em",
              }}>CANCEL</a>
              <button type="submit"
                disabled={loading || !type || !section || !codeProfile || !unitSystem}
                style={{
                  flex: 2,
                  background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(56,189,248,0.08))",
                  border: "1px solid rgba(56,189,248,0.4)",
                  borderRadius: 9, padding: "12px 0", color: ACCENT,
                  fontSize: 13, fontWeight: 600, fontFamily: "monospace",
                  letterSpacing: "0.1em", cursor: loading ? "not-allowed" : "pointer",
                  opacity: (!type || !section || !codeProfile || !unitSystem) ? 0.5 : 1,
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