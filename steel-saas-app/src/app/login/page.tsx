"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import MeshBackground from "@/components/MeshBackground";

export default function LoginPage() {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
      redirect: false,
    });

    if (result?.error) {
      setError(true);
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050a12", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <MeshBackground />
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 400, margin: "0 16px", background: "rgba(8,15,26,0.85)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: 16, padding: "40px 36px", backdropFilter: "blur(20px)", boxShadow: "0 32px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 1, background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.6), transparent)" }} />
        <h1 style={{ color: "#e0f2fe", fontSize: 22, fontWeight: 600, margin: "0 0 6px" }}>Sign in</h1>
        <p style={{ color: "rgba(148,163,184,0.7)", fontSize: 13, margin: "0 0 28px", fontFamily: "monospace" }}>AISC 360-22 · CSA S16-19</p>
        {error && <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>Invalid email or password.</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", color: "rgba(148,163,184,0.8)", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: 5 }}>EMAIL</label>
            <input name="email" type="email" required style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: 8, padding: "10px 14px", color: "#e0f2fe", fontSize: 14, outline: "none", width: "100%", fontFamily: "monospace" }} />
          </div>
          <div>
            <label style={{ display: "block", color: "rgba(148,163,184,0.8)", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.06em", marginBottom: 5 }}>PASSWORD</label>
            <input name="password" type="password" required style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: 8, padding: "10px 14px", color: "#e0f2fe", fontSize: 14, outline: "none", width: "100%", fontFamily: "monospace" }} />
          </div>
          <button type="submit" disabled={loading} style={{ marginTop: 8, background: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(56,189,248,0.08))", border: "1px solid rgba(56,189,248,0.35)", borderRadius: 8, padding: "11px 0", color: "#38bdf8", fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", fontFamily: "monospace", cursor: "pointer", width: "100%" }}>
            {loading ? "AUTHENTICATING..." : "AUTHENTICATE →"}
          </button>
        </form>
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <a href="/signup" style={{ color: "rgba(56,189,248,0.6)", fontSize: 12, textDecoration: "none", fontFamily: "monospace" }}>Request beta access</a>
        </div>
      </div>
    </div>
  );
}