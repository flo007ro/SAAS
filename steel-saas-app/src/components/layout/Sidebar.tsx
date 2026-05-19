"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type DesignRun = { id: string; title: string; type: string };
type Project = { id: string; name: string; codeProfile: string; runs?: DesignRun[] };

const typeIcon: Record<string, string> = {
  beam: "⌇",
  column: "▮",
  basePlate: "▬",
};

const typeLabel: Record<string, string> = {
  beam: "Beam",
  column: "Column",
  basePlate: "Base Plate",
};

function ProjectItem({ project }: { project: Project }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(pathname?.includes(project.id) ?? false);
  const isActive = pathname?.includes(project.id);

  const grouped: Record<string, DesignRun[]> = {};
  (project.runs ?? []).forEach(r => {
    (grouped[r.type] = grouped[r.type] ?? []).push(r);
  });

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          background: isActive ? "rgba(56,189,248,0.1)" : "transparent",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <span style={{ color: open ? "#38bdf8" : "rgba(148,163,184,0.5)", fontSize: 10, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
        <span style={{ flex: 1, fontSize: 13, color: isActive ? "#e0f2fe" : "rgba(148,163,184,0.8)", fontWeight: isActive ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {project.name}
        </span>
        <span style={{ fontSize: 10, color: "rgba(56,189,248,0.5)", fontFamily: "monospace" }}>
          {project.codeProfile === "AISC_360_22" ? "AISC" : "CSA"}
        </span>
      </button>

      {open && (
        <div style={{ marginLeft: 20, marginTop: 2 }}>
          {/* New run link */}
          <Link
            href={`/projects/${project.id}/runs/new`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              fontSize: 12,
              color: "rgba(56,189,248,0.6)",
              textDecoration: "none",
              borderRadius: 5,
              fontFamily: "monospace",
            }}
          >
            + new run
          </Link>

          {/* Grouped runs by type */}
          {Object.entries(grouped).map(([type, runs]) => (
            <div key={type} style={{ marginTop: 4 }}>
              <div style={{ padding: "3px 10px", fontSize: 10, color: "rgba(100,116,139,0.6)", fontFamily: "monospace", letterSpacing: "0.06em" }}>
                {typeIcon[type]} {typeLabel[type] ?? type}
              </div>
              {runs.map(run => (
                <Link
                  key={run.id}
                  href={`/projects/${project.id}/runs/${run.id}`}
                  style={{
                    display: "block",
                    padding: "4px 10px 4px 20px",
                    fontSize: 12,
                    color: pathname?.includes(run.id) ? "#38bdf8" : "rgba(148,163,184,0.6)",
                    textDecoration: "none",
                    borderRadius: 5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    background: pathname?.includes(run.id) ? "rgba(56,189,248,0.08)" : "transparent",
                  }}
                >
                  {run.title}
                </Link>
              ))}
            </div>
          ))}

          {Object.keys(grouped).length === 0 && (
            <div style={{ padding: "4px 10px", fontSize: 12, color: "rgba(100,116,139,0.4)", fontStyle: "italic" }}>
              No runs yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ projects }: { projects: Project[] }) {
  return (
    <aside style={{
      width: 240,
      minHeight: "100vh",
      background: "rgba(5,10,18,0.95)",
      borderRight: "1px solid rgba(56,189,248,0.1)",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 50,
      backdropFilter: "blur(12px)",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(56,189,248,0.08)" }}>
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
      </div>

      {/* Nav */}
      <div style={{ padding: "12px 8px" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 6, textDecoration: "none", color: "rgba(148,163,184,0.7)", fontSize: 13 }}>
          <span style={{ fontSize: 14 }}>⊞</span> Dashboard
        </Link>
        <Link href="/projects/new" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 6, textDecoration: "none", color: "rgba(56,189,248,0.7)", fontSize: 13, marginTop: 2 }}>
          <span style={{ fontSize: 14 }}>+</span> New project
        </Link>
      </div>

      {/* Projects list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
        <div style={{ padding: "6px 12px 6px", fontSize: 10, color: "rgba(100,116,139,0.5)", fontFamily: "monospace", letterSpacing: "0.08em" }}>
          PROJECTS
        </div>
        {projects.length === 0 && (
          <div style={{ padding: "8px 12px", fontSize: 12, color: "rgba(100,116,139,0.4)", fontStyle: "italic" }}>
            No projects yet
          </div>
        )}
        {projects.map(p => <ProjectItem key={p.id} project={p} />)}
      </div>

      {/* Bottom user area */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(56,189,248,0.08)" }}>
        <form method="POST" action="/api/auth/signout">
          <button type="submit" style={{
            width: "100%",
            background: "transparent",
            border: "1px solid rgba(56,189,248,0.1)",
            borderRadius: 6,
            padding: "7px 12px",
            color: "rgba(148,163,184,0.5)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "monospace",
            letterSpacing: "0.06em",
            textAlign: "left",
          }}>
            ← sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
