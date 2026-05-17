"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createProjectAction, type FormState } from "./actions";

const s = {
  page:  { padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "560px", margin: "0 auto" } as const,
  back:  { display: "inline-block", marginBottom: "1.25rem", fontSize: "0.875rem", color: "#6b7280", textDecoration: "none" } as const,
  h1:    { margin: "0 0 1.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" } as const,
  card:  { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1.75rem" } as const,
  label: { display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.25rem" } as const,
  opt:   { fontSize: "0.75rem", color: "#9ca3af", fontWeight: 400 } as const,
  input: { display: "block", width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "1rem", marginBottom: "0.25rem", boxSizing: "border-box" } as const,
  select:{ display: "block", width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "1rem", marginBottom: "0.25rem", boxSizing: "border-box", background: "#fff" } as const,
  fieldError: { color: "#dc2626", fontSize: "0.75rem", marginBottom: "0.75rem" } as const,
  spacer:{ marginBottom: "1rem" } as const,
  banner:{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: "4px", padding: "0.625rem 0.75rem", fontSize: "0.875rem", marginBottom: "1.25rem" } as const,
  row:   { display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" } as const,
  cancel:{ padding: "0.5rem 1rem", background: "transparent", color: "#374151", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "0.875rem", cursor: "pointer", textDecoration: "none" } as const,
  submit:{ padding: "0.5rem 1.25rem", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" } as const,
};

export default function NewProjectPage() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createProjectAction,
    null,
  );
  const fe = state?.fieldErrors ?? {};

  return (
    <main style={s.page}>
      <Link href="/projects" style={s.back}>← Projects</Link>
      <h1 style={s.h1}>New project</h1>

      <div style={s.card}>
        {state?.error && !Object.keys(fe).length && (
          <p role="alert" style={s.banner}>{state.error}</p>
        )}

        <form action={formAction}>
          {/* Name */}
          <label htmlFor="name" style={s.label}>
            Project name <span aria-hidden style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            id="name" name="name" type="text" required
            placeholder="e.g. Office Tower Frame"
            style={{ ...s.input, borderColor: fe.name ? "#fca5a5" : "#d1d5db" }}
          />
          {fe.name && <p style={s.fieldError}>{fe.name}</p>}
          <div style={s.spacer} />

          {/* Client */}
          <label htmlFor="client" style={s.label}>
            Client <span style={s.opt}>(optional)</span>
          </label>
          <input
            id="client" name="client" type="text"
            placeholder="e.g. City of Toronto"
            style={s.input}
          />
          <div style={s.spacer} />

          {/* Location */}
          <label htmlFor="location" style={s.label}>
            Location <span style={s.opt}>(optional)</span>
          </label>
          <input
            id="location" name="location" type="text"
            placeholder="e.g. Toronto, ON"
            style={s.input}
          />
          <div style={s.spacer} />

          {/* Code profile */}
          <label htmlFor="codeProfile" style={s.label}>
            Design code <span aria-hidden style={{ color: "#dc2626" }}>*</span>
          </label>
          <select
            id="codeProfile" name="codeProfile" required
            defaultValue=""
            style={{ ...s.select, borderColor: fe.codeProfile ? "#fca5a5" : "#d1d5db" }}
          >
            <option value="" disabled>Select code…</option>
            <option value="AISC_360_22">AISC 360-22</option>
            <option value="CSA_S16_19">CSA S16-19</option>
          </select>
          {fe.codeProfile && <p style={s.fieldError}>{fe.codeProfile}</p>}
          <div style={s.spacer} />

          {/* Unit system */}
          <label htmlFor="unitSystem" style={s.label}>
            Unit system <span aria-hidden style={{ color: "#dc2626" }}>*</span>
          </label>
          <select
            id="unitSystem" name="unitSystem" required
            defaultValue=""
            style={{ ...s.select, borderColor: fe.unitSystem ? "#fca5a5" : "#d1d5db" }}
          >
            <option value="" disabled>Select units…</option>
            <option value="metric">Metric (kN, mm, MPa)</option>
            <option value="imperial">Imperial (kip, in, ksi)</option>
          </select>
          {fe.unitSystem && <p style={s.fieldError}>{fe.unitSystem}</p>}

          <div style={s.row}>
            <Link href="/projects" style={s.cancel}>Cancel</Link>
            <button type="submit" disabled={pending} style={s.submit}>
              {pending ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
