"use client";
import { useState } from "react";

export default function ClearProjectsButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClear() {
    setLoading(true);
    await fetch("/api/projects/clear", { method: "POST" });
    window.location.reload();
  }

  if (confirming) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#f87171", fontFamily: "monospace" }}>Archive all projects?</span>
        <button onClick={handleClear} disabled={loading} style={{
          background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
          borderRadius: 6, padding: "5px 12px", color: "#f87171", fontSize: 12,
          fontFamily: "monospace", cursor: "pointer",
        }}>
          {loading ? "clearing..." : "yes, clear"}
        </button>
        <button onClick={() => setConfirming(false)} style={{
          background: "transparent", border: "1px solid rgba(148,163,184,0.15)",
          borderRadius: 6, padding: "5px 12px", color: "rgba(148,163,184,0.5)",
          fontSize: 12, fontFamily: "monospace", cursor: "pointer",
        }}>cancel</button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} style={{
      background: "transparent", border: "1px solid rgba(248,113,113,0.15)",
      borderRadius: 6, padding: "6px 14px", color: "rgba(248,113,113,0.5)",
      fontSize: 12, fontFamily: "monospace", cursor: "pointer", letterSpacing: "0.04em",
    }}>
      clear projects
    </button>
  );
}
