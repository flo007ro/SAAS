import Link from "next/link";
import MeshBackgroundCursor from "@/components/MeshBackgroundCursor";

const tag = (label: string, type: "live" | "soon" | "future") => {
  const styles = {
    live: { bg: "rgba(52,211,153,0.12)", color: "#34d399", border: "rgba(52,211,153,0.3)" },
    soon: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "rgba(251,191,36,0.3)" },
    future: { bg: "rgba(148,163,184,0.08)", color: "rgba(148,163,184,0.6)", border: "rgba(148,163,184,0.15)" },
  }[type];
  return (
    <span style={{
      display: "inline-block", fontSize: 13, fontWeight: 600, fontFamily: "monospace",
      letterSpacing: "0.08em", padding: "4px 11px", borderRadius: 5, marginBottom: 14,
      background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`,
    }}>{label}</span>
  );
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(8,15,26,0.78)",
      border: "1px solid rgba(56,189,248,0.13)",
      borderRadius: 14, padding: "26px 28px",
      backdropFilter: "blur(16px)", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: 1, background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.28), transparent)" }} />
      {children}
    </div>
  );
}

function FeatureRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "15px 0", borderBottom: "1px solid rgba(56,189,248,0.07)", alignItems: "flex-start" }}>
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div>
        <span style={{ fontSize: 18, fontWeight: 500, color: "#e0f2fe" }}>{title}</span>
        <span style={{ fontSize: 16, color: "rgba(148,163,184,0.6)", marginLeft: 10 }}>{desc}</span>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#070e1a", position: "relative" }}>
      <MeshBackgroundCursor />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 920, margin: "0 auto", padding: "64px 36px 96px" }}>

        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 80 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="14" width="10" height="12" rx="1.5" fill="#38bdf8" opacity="0.9"/>
              <rect x="8" y="8" width="10" height="18" rx="1.5" fill="#38bdf8" opacity="0.6"/>
              <rect x="14" y="2" width="10" height="24" rx="1.5" fill="#38bdf8" opacity="0.35"/>
            </svg>
            <span style={{ color: "#e0f2fe", fontSize: 18, fontWeight: 600, letterSpacing: "0.08em", fontFamily: "monospace" }}>
              STEEL<span style={{ color: "#38bdf8" }}>CALC</span>
            </span>
          </div>
          <Link href="/login" style={{
            background: "rgba(56,189,248,0.09)", border: "1px solid rgba(56,189,248,0.28)",
            borderRadius: 9, padding: "10px 22px", color: "#38bdf8", textDecoration: "none",
            fontSize: 15, fontFamily: "monospace", letterSpacing: "0.07em",
          }}>SIGN IN →</Link>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: 88, maxWidth: 720 }}>
          <div style={{
            display: "inline-block", fontSize: 13, fontFamily: "monospace", letterSpacing: "0.1em",
            color: "rgba(56,189,248,0.75)", background: "rgba(56,189,248,0.09)",
            border: "1px solid rgba(56,189,248,0.22)", borderRadius: 5,
            padding: "5px 14px", marginBottom: 28,
          }}>PAID BETA · AISC 360-22 · CSA S16-19</div>

          <h1 style={{ fontSize: 62, fontWeight: 600, color: "#e0f2fe", margin: "0 0 26px", letterSpacing: "-0.025em", lineHeight: 1.1 }}>
            Structural steel design,<br />
            <span style={{ color: "#38bdf8" }}>built for engineers</span>
          </h1>

          <p style={{ fontSize: 22, color: "rgba(148,163,184,0.78)", lineHeight: 1.75, margin: "0 0 40px" }}>
            SteelCalc is a cloud-based structural steel design tool for independent engineers and small firms.
            Run beam, column, and base plate calculations server-side — against AISC 360-22 or CSA S16-19 —
            and generate auditable PDF reports in seconds. No spreadsheet to share. No license key to protect.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/login" style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.24), rgba(56,189,248,0.12))",
              border: "1px solid rgba(56,189,248,0.48)", borderRadius: 10, padding: "15px 32px",
              color: "#38bdf8", textDecoration: "none", fontSize: 16, fontWeight: 600,
              fontFamily: "monospace", letterSpacing: "0.08em",
            }}>START CALCULATING →</Link>
            <Link href="/signup" style={{
              background: "transparent", border: "1px solid rgba(56,189,248,0.2)",
              borderRadius: 10, padding: "15px 32px", color: "rgba(148,163,184,0.75)",
              textDecoration: "none", fontSize: 16, fontFamily: "monospace", letterSpacing: "0.08em",
            }}>REQUEST BETA ACCESS</Link>
          </div>
        </div>

        {/* Live features */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 13, color: "rgba(52,211,153,0.65)", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 20 }}>AVAILABLE NOW</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { title: "Beam design", desc: "Moment and shear checks per AISC F2 + G2.1 and CSA 13.5. φMn, φVn, and DCRs with pass/fail." },
              { title: "Column design", desc: "Axial compression with inelastic and elastic buckling per AISC E3 and CSA 13.3.1. Slenderness ratio reported." },
              { title: "Base plate design", desc: "Bearing area and plate thickness per AISC J8 and CSA 17.5. Governing cantilever (m or n) identified automatically." },
              { title: "PDF calculation reports", desc: "Professional, auditable reports with inputs, section properties, code clause references, and engineer of record block." },
              { title: "AISC 360-22 and CSA S16-19", desc: "Code profile set per project. Resistance factors and buckling curves applied correctly per code." },
              { title: "Metric and imperial", desc: "Set per project. All inputs, results, and reports display in the selected unit system." },
            ].map(({ title, desc }) => (
              <Card key={title}>
                {tag("LIVE", "live")}
                <p style={{ fontSize: 19, fontWeight: 500, color: "#e0f2fe", margin: "0 0 8px" }}>{title}</p>
                <p style={{ fontSize: 16, color: "rgba(148,163,184,0.65)", margin: 0, lineHeight: 1.65 }}>{desc}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Coming next */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 13, color: "rgba(251,191,36,0.65)", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 20 }}>COMING NEXT</div>
          <Card>
            <FeatureRow icon="⌁" title="Connection design" desc="Bolted and welded shear connections, bearing and slip-critical checks per AISC Chapter J and CSA Clause 13." />
            <FeatureRow icon="⊞" title="Composite beam design" desc="Partial and full composite action, stud layout, and transformed section properties." />
            <FeatureRow icon="↗" title="Brace design" desc="Axial tension and compression members, slenderness limits, and seismic ductility flags." />
            <FeatureRow icon="▬" title="Moment base plates" desc="Combined axial and moment demand, anchor bolt tension, and bearing stress distribution." />
          </Card>
        </div>

        {/* Future roadmap */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ fontSize: 13, color: "rgba(148,163,184,0.42)", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 20 }}>FUTURE ROADMAP</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
                <p style={{ fontSize: 19, fontWeight: 500, color: "#e0f2fe", margin: "0 0 8px" }}>{title}</p>
                <p style={{ fontSize: 16, color: "rgba(148,163,184,0.52)", margin: 0, lineHeight: 1.65 }}>{desc}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.18)",
          borderRadius: 16, padding: "48px 40px", textAlign: "center", marginBottom: 40,
        }}>
          <h2 style={{ fontSize: 32, fontWeight: 600, color: "#e0f2fe", margin: "0 0 14px", letterSpacing: "-0.01em" }}>
            Ready to run your first calculation?
          </h2>
          <p style={{ fontSize: 19, color: "rgba(148,163,184,0.65)", margin: "0 0 32px" }}>
            Sign in and create a project in under a minute.
          </p>
          <Link href="/login" style={{
            background: "linear-gradient(135deg, rgba(56,189,248,0.22), rgba(56,189,248,0.11))",
            border: "1px solid rgba(56,189,248,0.42)", borderRadius: 10, padding: "15px 36px",
            color: "#38bdf8", textDecoration: "none", fontSize: 16, fontWeight: 600,
            fontFamily: "monospace", letterSpacing: "0.08em",
          }}>GET STARTED →</Link>
        </div>

        <p style={{ fontSize: 14, color: "rgba(100,116,139,0.42)", fontFamily: "monospace", textAlign: "center", lineHeight: 1.8 }}>
          Calculation aid only · All results must be verified by the engineer of record ·
          Engine and section DB versions stored with every run for full auditability
        </p>
      </div>
    </div>
  );
}
