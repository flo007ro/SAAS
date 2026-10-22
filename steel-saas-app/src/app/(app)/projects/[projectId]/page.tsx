import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const typeIcon: Record<string, string> = { beam: "⌇", column: "▮", base_plate: "▬", brace: "↗" };
const typeLabel: Record<string, string> = { beam: "Beam", column: "Column", base_plate: "Base Plate", brace: "Brace member checks" };

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.user.organizationId },
    include: {
      designRuns: {
        where: { status: { not: "superseded" } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) notFound();

  const grouped: Record<string, typeof project.designRuns> = {};
  project.designRuns.forEach(r => {
    (grouped[r.type] = grouped[r.type] ?? []).push(r);
  });

  return (
    <div style={{ minHeight: "100vh", background: "transparent", position: "relative" }}>
      <div style={{ position: "relative", zIndex: 10, padding: "48px 56px", maxWidth: 1000 }}>

        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(148,174,191,0.5)", fontSize: 12, fontFamily: "monospace", textDecoration: "none", marginBottom: 32 }}>
          ← Dashboard
        </Link>

        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 600, color: "#e8edf0", margin: "0 0 10px", letterSpacing: "-0.01em" }}>
                {project.name}
              </h1>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                {project.client && project.client !== "—" && (
                  <span style={{ color: "rgba(148,163,184,0.6)", fontSize: 13 }}>{project.client}</span>
                )}
                {project.location && project.location !== "—" && (
                  <span style={{ color: "rgba(148,163,184,0.4)", fontSize: 13 }}>📍 {project.location}</span>
                )}
                <span style={{ color: "rgba(148,174,191,0.6)", fontSize: 12, fontFamily: "monospace", background: "rgba(148,174,191,0.08)", border: "1px solid rgba(148,174,191,0.15)", borderRadius: 4, padding: "2px 8px" }}>
                  {project.codeProfile === "AISC_360_22" ? "AISC 360-22" : "CSA S16-19"}
                </span>
                <span style={{ color: "rgba(100,116,139,0.5)", fontSize: 12, fontFamily: "monospace" }}>
                  {project.unitSystem}
                </span>
              </div>
            </div>
            <Link href={`/projects/${project.id}/runs/new`} style={{
              background: "linear-gradient(135deg, rgba(148,174,191,0.15), rgba(148,174,191,0.08))",
              border: "1px solid rgba(148,174,191,0.3)", borderRadius: 8,
              padding: "10px 20px", color: "#b2c6d0", textDecoration: "none",
              fontSize: 12, fontFamily: "monospace", letterSpacing: "0.08em", whiteSpace: "nowrap",
            }}>+ NEW RUN</Link>
          </div>
        </div>

        {project.designRuns.length === 0 ? (
          <div style={{
            background: "rgba(22,28,34,0.6)", border: "1px dashed rgba(148,174,191,0.12)",
            borderRadius: 12, padding: "56px 32px", textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>⌇</div>
            <p style={{ color: "rgba(148,163,184,0.4)", fontFamily: "monospace", fontSize: 13, margin: "0 0 20px" }}>No design runs yet</p>
            <Link href={`/projects/${project.id}/runs/new`} style={{
              background: "rgba(148,174,191,0.1)", border: "1px solid rgba(148,174,191,0.25)",
              borderRadius: 8, padding: "9px 20px", color: "#b2c6d0",
              textDecoration: "none", fontSize: 13, fontFamily: "monospace",
            }}>Create first design run →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {Object.entries(grouped).map(([type, runs]) => (
              <div key={type}>
                <div style={{ fontSize: 11, color: "rgba(148,174,191,0.5)", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{typeIcon[type] ?? "·"}</span>
                  <span>{typeLabel[type] ?? type}</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(148,174,191,0.08)", marginLeft: 8 }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {runs.map(run => {
                    const result = run.resultJson as Record<string, unknown> | null;
                    const pass = (result?.displayResults as Record<string, unknown> | undefined)?.pass === true;
                    const reviewRequired = run.type === "brace";
                    return (
                      <Link key={run.id} href={`/projects/${project.id}/runs/${run.id}`} style={{ textDecoration: "none" }}>
                        <div style={{
                          background: "rgba(22,28,34,0.75)", border: "1px solid rgba(148,174,191,0.1)",
                          borderRadius: 10, padding: "16px 20px",
                          display: "flex", alignItems: "center", gap: 16,
                        }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ color: "#e8edf0", fontSize: 14, fontWeight: 500 }}>{run.title}</span>
                          </div>
                          <span style={{ color: "rgba(100,116,139,0.5)", fontSize: 11, fontFamily: "monospace" }}>
                            {new Date(run.createdAt).toLocaleDateString()}
                          </span>
                          {run.status === "complete" && result && (
                            <span style={{
                              fontSize: 11, fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.06em",
                              color: reviewRequired ? "#fbbf24" : pass ? "#34d399" : "#f87171",
                              background: reviewRequired ? "rgba(251,191,36,0.08)" : pass ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                              border: `1px solid ${reviewRequired ? "rgba(251,191,36,0.25)" : pass ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
                              borderRadius: 5, padding: "2px 9px",
                            }}>{reviewRequired ? "REVIEW REQUIRED" : pass ? "✓ CHECKS PASS" : "✗ CHECKS FAIL"}</span>
                          )}
                          {run.status !== "complete" && (
                            <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(148,163,184,0.4)" }}>
                              {run.status}
                            </span>
                          )}
                          <span style={{ color: "rgba(148,174,191,0.3)", fontSize: 16 }}>›</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
