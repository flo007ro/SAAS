import MeshBackground from "@/components/MeshBackground";

export default function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#050a12", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <MeshBackground />

      {/* Logo / wordmark */}
      <div style={{ position: "fixed", top: 28, left: 36, zIndex: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="2" y="14" width="10" height="12" rx="1.5" fill="#38bdf8" opacity="0.9"/>
          <rect x="8" y="8" width="10" height="18" rx="1.5" fill="#38bdf8" opacity="0.6"/>
          <rect x="14" y="2" width="10" height="24" rx="1.5" fill="#38bdf8" opacity="0.35"/>
        </svg>
        <span style={{ color: "#e0f2fe", fontSize: 15, fontWeight: 600, letterSpacing: "0.08em", fontFamily: "monospace" }}>
          STEEL<span style={{ color: "#38bdf8" }}>CALC</span>
        </span>
      </div>

      {/* Card */}
      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: 400,
        margin: "0 16px",
        background: "rgba(8,15,26,0.85)",
        border: "1px solid rgba(56,189,248,0.15)",
        borderRadius: 16,
        padding: "40px 36px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 0 0 1px rgba(56,189,248,0.06), 0 32px 64px rgba(0,0,0,0.5)",
      }}>
        {/* Top accent line */}
        <div style={{
          position: "absolute", top: 0, left: "20%", right: "20%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.6), transparent)",
          borderRadius: 1,
        }} />

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: "#e0f2fe", fontSize: 22, fontWeight: 600, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            Sign in
          </h1>
          <p style={{ color: "rgba(148,163,184,0.7)", fontSize: 13, margin: 0, fontFamily: "monospace" }}>
            AISC 360-22 · CSA S16-19
          </p>
        </div>

        <form method="POST" action="/api/auth/callback/credentials" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input type="hidden" name="csrfToken" />

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "rgba(148,163,184,0.8)", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.06em" }}>
              EMAIL
            </label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(56,189,248,0.15)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#e0f2fe",
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.2s",
                fontFamily: "monospace",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
              onBlur={e => (e.target.style.borderColor = "rgba(56,189,248,0.15)")}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "rgba(148,163,184,0.8)", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.06em" }}>
              PASSWORD
            </label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(56,189,248,0.15)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#e0f2fe",
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.2s",
                fontFamily: "monospace",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(56,189,248,0.5)")}
              onBlur={e => (e.target.style.borderColor = "rgba(56,189,248,0.15)")}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: 8,
              background: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(56,189,248,0.08))",
              border: "1px solid rgba(56,189,248,0.35)",
              borderRadius: 8,
              padding: "11px 0",
              color: "#38bdf8",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.1em",
              fontFamily: "monospace",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = "linear-gradient(135deg, rgba(56,189,248,0.25), rgba(56,189,248,0.15))";
              (e.target as HTMLButtonElement).style.borderColor = "rgba(56,189,248,0.6)";
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(56,189,248,0.08))";
              (e.target as HTMLButtonElement).style.borderColor = "rgba(56,189,248,0.35)";
            }}
          >
            AUTHENTICATE →
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <a href="/signup" style={{ color: "rgba(56,189,248,0.6)", fontSize: 12, textDecoration: "none", fontFamily: "monospace" }}>
            Request beta access
          </a>
        </div>
      </div>

      {/* Bottom disclaimer */}
      <div style={{ position: "fixed", bottom: 20, left: 0, right: 0, textAlign: "center", zIndex: 10 }}>
        <span style={{ color: "rgba(100,116,139,0.5)", fontSize: 11, fontFamily: "monospace" }}>
          Calculation aid only · Engineer of record must verify all results
        </span>
      </div>
    </div>
  );
}
