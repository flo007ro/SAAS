"use client";
import MeshBackground from "@/components/MeshBackground";
import { useRouter } from "next/navigation";
import { useState } from "react";

const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(56,189,248,0.15)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "#e0f2fe",
  fontSize: 14,
  outline: "none",
  width: "100%",
  fontFamily: "monospace",
  transition: "border-color 0.2s",
};

const labelStyle = {
  display: "block" as const,
  color: "rgba(148,163,184,0.7)",
  fontSize: 11,
  fontFamily: "monospace",
  letterSpacing: "0.07em",
  marginBottom: 6,
};

export default function NewProjectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      client: (form.elements.namedItem("client") as HTMLInputElement).value || "—",
      location: (form.elements.namedItem("location") as HTMLInputElement).value || "—",
      codeProfile: (form.elements.namedItem("codeProfile") as HTMLSelectElement).value,
      unitSystem: (form.elements.namedItem("unitSystem") as HTMLSelectElement).value,
    };

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? "Failed to create project.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050a12", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <MeshBackground />
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 520, margin: "0 20px" }}>

        {/* Back */}
        <a href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(56,189,248,0.5)", fontSize: 12, fontFamily: "monospace", textDecoration: "none", marginBottom: 24 }}>
          ← Dashboard
        </a>

        {/* Card */}
        <div style={{
          background: "rgba(8,15,26,0.85)",
          border: "1px solid rgba(56,189,248,0.15)",
          borderRadius: 16,
          padding: "40px 36px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 32px 64px rgba(0,0,0,0.4)",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.5), transparent)" }} />

          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#e0f2fe", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
              New project
            </h1>
            <p style={{ color: "rgba(148,163,184,0.5)", fontSize: 12, fontFamily: "monospace", margin: 0 }}>
              Configure code profile and unit system
            </p>
          </div>

          {error && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 20, fontFamily: "monospace" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <div>
              <label style={labelStyle}>PROJECT NAME <span style={{ color: "#f87171" }}>*</span></label>
              <input name="name" required placeholder="e.g. Office Tower Frame" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.45)")}
                onBlur={e => (e.target.style.borderColor = "rgba(56,189,248,0.15)")} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>CLIENT <span style={{ color: "rgba(100,116,139,0.5)" }}>(optional)</span></label>
                <input name="client" placeholder="e.g. City of Toronto" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.45)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(56,189,248,0.15)")} />
              </div>
              <div>
                <label style={labelStyle}>LOCATION <span style={{ color: "rgba(100,116,139,0.5)" }}>(optional)</span></label>
                <input name="location" placeholder="e.g. Toronto, ON" style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.45)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(56,189,248,0.15)")} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>DESIGN CODE <span style={{ color: "#f87171" }}>*</span></label>
              <select name="codeProfile" required defaultValue="" style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="" disabled>Select code profile...</option>
                <option value="AISC_360_22">AISC 360-22 (US)</option>
                <option value="CSA_S16_19">CSA S16-19 (Canada)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>UNIT SYSTEM <span style={{ color: "#f87171" }}>*</span></label>
              <select name="unitSystem" required defaultValue="" style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="" disabled>Select unit system...</option>
                <option value="imperial">Imperial (kip, ft, in)</option>
                <option value="metric">Metric (kN, m, mm)</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <a href="/dashboard" style={{
                flex: 1,
                background: "transparent",
                border: "1px solid rgba(56,189,248,0.15)",
                borderRadius: 8,
                padding: "11px 0",
                color: "rgba(148,163,184,0.6)",
                fontSize: 13,
                fontFamily: "monospace",
                textDecoration: "none",
                textAlign: "center",
                letterSpacing: "0.06em",
              }}>
                CANCEL
              </a>
              <button type="submit" disabled={loading} style={{
                flex: 2,
                background: loading ? "rgba(56,189,248,0.06)" : "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(56,189,248,0.08))",
                border: "1px solid rgba(56,189,248,0.35)",
                borderRadius: 8,
                padding: "11px 0",
                color: "#38bdf8",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.1em",
                fontFamily: "monospace",
                cursor: loading ? "not-allowed" : "pointer",
              }}>
                {loading ? "CREATING..." : "CREATE PROJECT →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
