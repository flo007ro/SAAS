import Link from "next/link";
import MeshBackgroundCursor from "@/components/MeshBackgroundCursor";

const tag = (label: string, type: "live" | "soon" | "future") => {
  const styles = {
    live: { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.25)" },
    soon: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.25)" },
    future: { bg: "rgba(148,163,184,0.08)", color: "rgba(148,163,184,0.6)", border: "rgba(148,163,184,0.15)" },
  }[type];
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 600, fontFamily: "monospace",
      letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 4, marginBottom: 10,
      background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`,
    }}>{label}</span>
  );
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(8,15,26,0.75)",
      border: "1px solid rgba(56,189,248,0.1)",
      borderRadius: 12,
      padding: "20px 22px",
      backdropFilter: "blur(14px)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: 1, background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.2), transparent)" }} />
      {children}
    </div>
  );
}

function FeatureRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: "1px solid rgba(56,189,248,0.06)", alignItems: "flex-start" }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#e0f2fe" }}>{title}</span>
        <span style={{ fontSize: 13, color: "rgba(148,163,184,0.6)", marginLeft: 8 }}>{desc}</span>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#050a12", position: "relative" }}>
      <MeshBackgroundCursor />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 860, margin: "0 auto", padding: "64px 32px 80px" }}>

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 72 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="14" width="10" height="12" rx="1.5" fill="#38bdf8" opacity="0.9"/>
              <rect x="8" y="8" width="10" height="18" rx="1.5" fill="#38bdf8" opacity="0.6"/>
              <rect x="14" y="2" width="10" height="24" rx="1.5" fill="#38bdf8" opacity="0.35"/>
            </svg>
            <span style={{ color: "#e0f2fe", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", fontFamily: "monospace" }}>
              STEEL<span style={{ color: "#38bdf8" }}>CALC</span>
            </span>
          </div>
          <Link href="/login" style={{
            background: "rgba(56,189,248,0.08)",
            border: "1px solid rgba(56,189,248,0.25)",
            borderRadius: 7,
            padding: "7px 18px",
            color: "#38bdf8",
            textDecoration: "none",
            fontSize: 12,
            fontFamily: "monospace",
            letterSpacing: "0.06em",
          }}>
            SIGN IN →
          </Link>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: 72, maxWidth: 640 }}>
          <div style={{
            display: "inline-block",
            fontSize: 10, fontFamily: "monospace", letterSpacing: "0.1em",
            color: "rgba(56,189,248,0.6)",
            background: "rgba(56,189,248,0.06)",
            border: "1px solid rgba(56,189,248,0.15)",
            borderRadius: 4,
            padding: "3px 10px",
            marginBottom: 20,
          }}>
            PAID BETA · AISC 360-22 · CSA S16-19
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 600, color: "#e0f2fe", margin: "0 0 20px", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            Structural steel design,<br />
            <span style={{ color: "#38bdf8" }}>built for engineers</span>
          </h1>
          <p style={{ fontSize: 16, color: "rgba(148,163,184,0.7)", lineHeight: 1.7, margin: "0 0 32px" }}>
            SteelCalc is a cloud-based structural steel design tool for independent engineers and small firms.
            Run beam, column, and base plate calculations server-side — against AISC 360-22 or CSA S16-19 —
            and generate auditable PDF reports in seconds. No spreadsheet to share. No license key to protect.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/login" style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(56,189,248,0.1))",
              border: "1px solid rgba(56,189,248,0.4)",
              borderRadius: 8, padding: "11px 24px",
              color: "#38bdf8", textDecoration: "none",
              fontSize: 13, fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.08em",
            }}>
              START CALCULATING →
            </Link>
            <Link href="/signup" style={{
              background: "transparent",
              border: "1px solid rgba(56,189,248,0.15)",
              borderRadius: 8, padding: "11px 24px",
              color: "rgba(148,163,184,0.7)", textDecoration: "none",
              fontSize: 13, fontFamily: "monospace", letterSpacing: "0.08em",
            }}>
              REQUEST BETA ACCESS
            </Link>
          </div>
        </div>

        {/* Live features */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: "rgba(56,189,248,0.5)", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 16 }}>
            AVAILABLE NOW
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { title: "Beam design", desc: "Moment and shear checks per AISC F2 + G2.1 and CSA 13.5. φMn, φVn, and DCRs with pass/fail." },
              { title: "Column design", desc: "Axial compression with inelastic and elastic buckling per AISC E3 and CSA 13.3.1. Slenderness ratio reported." },
              { title: "Base plate design", desc: "Bearing area and plate thickness per AISC J8 and CSA 17.5. Governing cantilever (m or n) identified automatically." },
              { title: "PDF calculation reports", desc: "Professional, auditable reports with inputs, section properties, code clause references, and engineer of record block." },
              { title: "AISC 360-22 and CSA S16-19", desc: "Code profile set per project. Resistance factors, buckling curves, and bearing coefficients applied correctly per code." },
              { title: "Metric and imperial", desc: "Set per project. All inputs, results, and reports display in the selected unit system." },
            ].map(({ title, desc }) => (
              <Card key={title}>
                {tag("LIVE", "live")}
                <p style={{ fontSize: 14, fontWeight: 500, color: "#e0f2fe", margin: "0 0 5px" }}>{title}</p>
                <p style={{ fontSize: 13, color: "rgba(148,163,184,0.6)", margin: 0, lineHeight: 1.55 }}>{desc}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Coming next */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: "rgba(251,191,36,0.5)", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 16 }}>
            COMING NEXT
          </div>
          <Card>
            <FeatureRow icon="⌁" title="Connection design" desc="Bolted and welded shear connections, bearing and slip-critical checks per AISC Chapter J and CSA Clause 13." />
            <FeatureRow icon="⊞" title="Composite beam design" desc="Partial and full composite action, stud layout, and transformed section properties." />
            <FeatureRow icon="↗" title="Brace design" desc="Axial tension and compression members, slenderness limits, and seismic ductility flags." />
            <FeatureRow icon="▬" title="Moment base plates" desc="Combined axial and moment demand, anchor bolt tension, and bearing stress distribution." />
          </Card>
        </div>

        {/* Future roadmap */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 16 }}>
            FUTURE ROADMAP
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { title: "Load combination generator", desc: "ASCE 7 and NBCC factored combinations generated from unfactored inputs." },
              { title: "Vibration checks", desc: "Floor beam natural frequency and acceleration per AISC Design Guide 11." },
              { title: "Lateral and seismic", desc: "Storey shear distribution, drift checks, and ductility classification." },
              { title: "Steel takeoff", desc: "Section designations and lengths summarized into a material list with unit weights." },
              { title: "Spread footing design", desc: "Bearing pressure, footing thickness, and reinforcement checks." },
              { title: "Public API", desc: "Programmatic access to the calculation engine for integration with your own tools." },
            ].map(({ title, desc }) => (
              <Card key={title}>
                {tag("PLANNED", "future")}
                <p style={{ fontSize: 14, fontWeight: 500, color: "#e0f2fe", margin: "0 0 5px" }}>{title}</p>
                <p style={{ fontSize: 13, color: "rgba(148,163,184,0.5)", margin: 0, lineHeight: 1.55 }}>{desc}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Disclaimer footer */}
        <div style={{
          background: "rgba(8,15,26,0.6)",
          border: "1px solid rgba(56,189,248,0.08)",
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 32,
        }}>
          <p style={{ fontSize: 12, color: "rgba(100,116,139,0.5)", fontFamily: "monospace", margin: 0, lineHeight: 1.7 }}>
            SteelCalc is a calculation aid only. All results must be reviewed and verified by the engineer of record before use in design.
            Engine version and section database version are stored with every run for full auditability.
          </p>
        </div>

        <p style={{ fontSize: 11, color: "rgba(100,116,139,0.35)", fontFamily: "monospace", textAlign: "center" }}>
          Paid beta · AISC 360-22 · CSA S16-19 · Metric and Imperial
        </p>
      </div>
    </div>
  );
}