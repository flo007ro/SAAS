import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import MeshBackground from "@/components/MeshBackground";
import ClearProjectsButton from "@/components/ClearProjectsButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { organizationId: session.user.organizationId, archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { designRuns: true } } },
  });

  const totalRuns = projects.reduce((sum, p) => sum + p._count.designRuns, 0);
  const userName = session.user.email?.split("@")[0] ?? "Engineer";

  return (
    <div style={{ minHeight: "100vh", background: "#050a12", position: "relative" }}>
      <MeshBackground />
      <div style={{ position: "relative", zIndex: 10, padding: "48px 56px", maxWidth: 1100 }}>

        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="14" width="10" height="12" rx="1.5" fill="#38bdf8" opacity="0.9"/>
              <rect x="8" y="8" width="10" height="18" rx="1.5" fill="#38bdf8" opacity="0.6"/>
              <rect x="14" y="2" width="10" height="24" rx="1.5" fill="#38bdf8" opacity="0.35"/>
            </svg>
            <span style={{ color: "#e0f2fe", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", fontFamily: "monospace" }}>
              STEEL<span style={{ color: "#38bdf8" }}>CALC</span>
            </span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: "#e0f2fe", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            Welcome back, <span style={{ color: "#38bdf8" }}>{userName}</span>
          </h1>
          <p style={{ color: "rgba(148,163,184,0.6)", fontSize: 13, fontFamily: "monospace", margin: 0 }}>
            AISC 360-22 · CSA S16-19 · Structural Steel Design
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
          {[
            { label: "PROJECTS", value: String(projects.length), icon: "⊞" },
            { label: "DESIGN RUNS", value: String(totalRuns), icon: "⌇" },
            { label: "CODE PROFILES", value: "AISC · CSA", icon: "§" },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              background: "rgba(8,15,26,0.8)", border: "1px solid rgba(56,189,248,0.1)",
              borderRadius: 12, padding: "20px 24px", backdropFilter: "blur(16px)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: 1, background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.3), transparent)" }} />
              <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: "#38bdf8", fontFamily: "monospace", marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", fontFamily: "monospace", letterSpacing: "0.08em" }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 13, color: "rgba(56,189,248,0.6)", fontFamily: "monospace", letterSpacing: "0.1em", margin: 0 }}>
            RECENT PROJECTS
          </h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <ClearProjectsButton />
            <Link href="/projects/new" style={{
              background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.25)",
              borderRadius: 7, padding: "7px 16px", color: "#38bdf8",
              textDecoration: "none", fontSize: 12, fontFamily: "monospace", letterSpacing: "0.06em",
            }}>+ NEW PROJECT</Link>
          </div>
        </div>

        {projects.length === 0 ? (
          <div style={{
            background: "rgba(8,15,26,0.6)", border: "1px dashed rgba(56,189,248,0.15)",
            borderRadius: 12, padding: "48px 32px", textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>⊞</div>
            <p style={{ color: "rgba(148,163,184,0.5)", fontFamily: "monospace", fontSize: 13, margin: "0 0 20px" }}>No projects yet</p>
            <Link href="/projects/new" style={{
              background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)",
              borderRadius: 8, padding: "9px 20px", color: "#38bdf8",
              textDecoration: "none", fontSize: 13, fontFamily: "monospace",
            }}>Create your first project →</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
            {projects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "rgba(8,15,26,0.75)", border: "1px solid rgba(56,189,248,0.1)",
                  borderRadius: 10, padding: "20px 22px", backdropFilter: "blur(12px)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <h3 style={{ color: "#e0f2fe", fontSize: 15, fontWeight: 500, margin: 0, flex: 1 }}>{p.name}</h3>
                    <span style={{
                      fontSize: 10, fontFamily: "monospace", color: "rgba(56,189,248,0.6)",
                      background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.15)",
                      borderRadius: 4, padding: "2px 7px", marginLeft: 8, flexShrink: 0,
                    }}>{p.codeProfile === "AISC_360_22" ? "AISC" : "CSA"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {p.client && p.client !== "—" && (
                      <span style={{ color: "rgba(148,163,184,0.5)", fontSize: 12 }}>{p.client}</span>
                    )}
                    <span style={{ color: "rgba(100,116,139,0.5)", fontSize: 11, fontFamily: "monospace" }}>
                      {p._count.designRuns} run{p._count.designRuns !== 1 ? "s" : ""}
                    </span>
                    <span style={{ color: "rgba(100,116,139,0.4)", fontSize: 11, fontFamily: "monospace", marginLeft: "auto" }}>
                      {p.unitSystem}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(56,189,248,0.06)" }}>
          <p style={{ color: "rgba(100,116,139,0.4)", fontSize: 11, fontFamily: "monospace", margin: 0 }}>
            Calculation aid only · All results must be verified by the engineer of record
          </p>
        </div>
      </div>
    </div>
  );
}
