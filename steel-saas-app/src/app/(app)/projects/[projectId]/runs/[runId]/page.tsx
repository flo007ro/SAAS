import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import MeshBackground from "@/components/MeshBackground";

function Row({ label, value, highlight }: { label: string; value: string; highlight?: "pass" | "fail" | null }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid rgba(56,189,248,0.06)",
    }}>
      <span style={{ color: "rgba(148,163,184,0.7)", fontSize: 13 }}>{label}</span>
      <span style={{
        fontSize: 13,
        fontFamily: "monospace",
        fontWeight: highlight ? 600 : 400,
        color: highlight === "pass" ? "#34d399" : highlight === "fail" ? "#f87171" : "#e0f2fe",
      }}>
        {value}
        {highlight === "pass" && <span style={{ marginLeft: 6, fontSize: 11 }}>✓</span>}
        {highlight === "fail" && <span style={{ marginLeft: 6, fontSize: 11 }}>✗</span>}
      </span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(8,15,26,0.75)",
      border: "1px solid rgba(56,189,248,0.1)",
      borderRadius: 12,
      padding: "24px",
      backdropFilter: "blur(12px)",
      marginBottom: 16,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.2), transparent)" }} />
      <div style={{ fontSize: 11, color: "rgba(56,189,248,0.5)", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default async function RunResultPage({ params }: { params: { projectId: string; runId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const run = await prisma.designRun.findFirst({
    where: { id: params.runId, project: { organizationId: session.user.organizationId } },
    include: { project: true },
  });

  if (!run) notFound();

  const result = run.resultJson as any;
  const display = result?.displayResults ?? {};
  const snapshot = result?.displayInputSnapshot ?? {};
  const section = result?.sectionSnapshot ?? {};
  const warnings = result?.warnings ?? [];
  const codeRefs = result?.codeClauseReferences ?? [];
  const overallPass = result?.overallPass;

  const typeLabel: Record<string, string> = { beam: "Beam", column: "Column", basePlate: "Base Plate" };

  return (
    <div style={{ minHeight: "100vh", background: "#050a12", position: "relative" }}>
      <MeshBackground />
      <div style={{ position: "relative", zIndex: 10, padding: "48px 56px", maxWidth: 860 }}>

        {/* Back */}
        <Link href={`/projects/${run.projectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(56,189,248,0.5)", fontSize: 12, fontFamily: "monospace", textDecoration: "none", marginBottom: 32 }}>
          ← {run.project.name}
        </Link>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, color: "#e0f2fe", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              {run.title}
            </h1>
            <p style={{ color: "rgba(148,163,184,0.5)", fontSize: 12, fontFamily: "monospace", margin: 0 }}>
              {typeLabel[run.type] ?? run.type} · {run.project.codeProfile === "AISC_360_22" ? "AISC 360-22" : "CSA S16-19"} · {run.project.unitSystem}
            </p>
          </div>
          {run.status === "complete" && result && (
            <div style={{
              background: overallPass ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
              border: `1px solid ${overallPass ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
              borderRadius: 10,
              padding: "12px 20px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: overallPass ? "#34d399" : "#f87171", fontFamily: "monospace", letterSpacing: "0.05em" }}>
                {overallPass ? "✓ PASS" : "✗ FAIL"}
              </div>
            </div>
          )}
          {run.status === "failed" && (
            <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 10, padding: "12px 20px" }}>
              <div style={{ color: "#fbbf24", fontSize: 13, fontFamily: "monospace" }}>Calculation failed</div>
              {run.errorCode && <div style={{ color: "rgba(251,191,36,0.6)", fontSize: 11, marginTop: 4 }}>{run.errorCode}</div>}
            </div>
          )}
        </div>

        {run.status !== "complete" && run.status !== "failed" && (
          <Card title="STATUS">
            <p style={{ color: "rgba(148,163,184,0.6)", fontFamily: "monospace", fontSize: 13 }}>
              Status: {run.status}
            </p>
          </Card>
        )}

        {run.status === "complete" && result && (
          <>
            {/* Warnings */}
            {warnings.length > 0 && (
              <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, padding: "14px 20px", marginBottom: 16 }}>
                {warnings.map((w: string, i: number) => (
                  <p key={i} style={{ color: "#fbbf24", fontSize: 13, margin: i > 0 ? "8px 0 0" : 0 }}>⚠ {w}</p>
                ))}
              </div>
            )}
            {warnings.length === 0 && (
              <div style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 10, padding: "12px 20px", marginBottom: 16 }}>
                <p style={{ color: "rgba(52,211,153,0.7)", fontSize: 12, fontFamily: "monospace", margin: 0 }}>✓ No warnings</p>
              </div>
            )}

            {/* Demand / Capacity */}
            <Card title="DEMAND / CAPACITY">
              {run.type === "beam" && (
                <>
                  <Row label="Factored moment (M_f)" value={`${snapshot.factoredMoment?.value ?? "—"} ${snapshot.factoredMoment?.unit ?? ""}`} />
                  <Row label="Moment capacity φMn" value={`${display.designMomentCapacity ?? "—"} ${snapshot.factoredMoment?.unit ?? ""}`} />
                  <Row
                    label="Moment DCR"
                    value={display.momentDCR != null ? display.momentDCR.toFixed(3) : "—"}
                    highlight={display.momentDCR != null ? (display.momentDCR <= 1 ? "pass" : "fail") : null}
                  />
                  <div style={{ margin: "8px 0" }} />
                  <Row label="Factored shear (V_f)" value={`${snapshot.factoredShear?.value ?? "—"} ${snapshot.factoredShear?.unit ?? ""}`} />
                  <Row label="Shear capacity φVn" value={`${display.designShearCapacity ?? "—"} ${snapshot.factoredShear?.unit ?? ""}`} />
                  <Row
                    label="Shear DCR"
                    value={display.shearDCR != null ? display.shearDCR.toFixed(3) : "—"}
                    highlight={display.shearDCR != null ? (display.shearDCR <= 1 ? "pass" : "fail") : null}
                  />
                </>
              )}
              {run.type === "column" && (
                <>
                  <Row label="Factored compression (C_f)" value={`${snapshot.factoredCompression?.value ?? "—"} ${snapshot.factoredCompression?.unit ?? ""}`} />
                  <Row label="Axial capacity φCr" value={`${display.designAxialCapacity ?? "—"} ${snapshot.factoredCompression?.unit ?? ""}`} />
                  <Row label="Slenderness KL/r" value={display.slendernessRatio?.toFixed(1) ?? "—"} />
                  <Row
                    label="DCR"
                    value={display.demandCapacityRatio != null ? display.demandCapacityRatio.toFixed(3) : "—"}
                    highlight={display.demandCapacityRatio != null ? (display.demandCapacityRatio <= 1 ? "pass" : "fail") : null}
                  />
                </>
              )}
              {run.type === "basePlate" && (
                <>
                  <Row label="Factored compression (P_u)" value={`${snapshot.factoredCompression?.value ?? "—"} ${snapshot.factoredCompression?.unit ?? ""}`} />
                  <Row label="Required bearing area" value={display.requiredBearingArea ?? "—"} />
                  <Row label="Governing cantilever" value={display.governingCantilever ?? "—"} />
                  <Row label="Required plate thickness t_p" value={display.requiredPlateThickness ?? "—"} />
                  <Row
                    label="Bearing DCR"
                    value={display.demandCapacityRatio != null ? display.demandCapacityRatio.toFixed(3) : "—"}
                    highlight={display.demandCapacityRatio != null ? (display.demandCapacityRatio <= 1 ? "pass" : "fail") : null}
                  />
                </>
              )}
            </Card>

            {/* Section properties */}
            {section.designation && (
              <Card title="SECTION PROPERTIES USED">
                <Row label="Designation" value={section.designation} />
                {section.A && <Row label="Area A" value={`${section.A} ${run.project.unitSystem === "metric" ? "mm²" : "in²"}`} />}
                {section.d && <Row label="Depth d" value={`${section.d} ${run.project.unitSystem === "metric" ? "mm" : "in"}`} />}
                {section.bf && <Row label="Flange width bf" value={`${section.bf} ${run.project.unitSystem === "metric" ? "mm" : "in"}`} />}
                {section.Sx && <Row label="Elastic modulus Sx" value={`${section.Sx} ${run.project.unitSystem === "metric" ? "×10³ mm³" : "in³"}`} />}
                {section.ry && <Row label="Weak-axis ry" value={`${section.ry} ${run.project.unitSystem === "metric" ? "mm" : "in"}`} />}
                {section.Fy && <Row label="Yield strength Fy" value={`${section.Fy} ${run.project.unitSystem === "metric" ? "MPa" : "ksi"}`} />}
              </Card>
            )}

            {/* Code clauses */}
            {codeRefs.length > 0 && (
              <Card title="CODE CLAUSE REFERENCES">
                {codeRefs.map((ref: string, i: number) => (
                  <p key={i} style={{ color: "rgba(148,163,184,0.7)", fontSize: 13, margin: i > 0 ? "6px 0 0" : 0, fontFamily: "monospace" }}>§ {ref}</p>
                ))}
              </Card>
            )}

            {/* PDF download */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
              <a
                href={`/api/design-runs/${run.id}/report`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(56,189,248,0.08))",
                  border: "1px solid rgba(56,189,248,0.35)",
                  borderRadius: 8,
                  padding: "11px 24px",
                  color: "#38bdf8",
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "monospace",
                  letterSpacing: "0.08em",
                }}
              >
                ↓ DOWNLOAD PDF
              </a>
            </div>
          </>
        )}

        {/* Metadata footer */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid rgba(56,189,248,0.06)" }}>
          <p style={{ color: "rgba(100,116,139,0.4)", fontSize: 11, fontFamily: "monospace", margin: "0 0 4px" }}>
            Engine: {result?.engineVersion ?? run.engineVersion} · Section DB: {result?.sectionDbVersion ?? "—"} · {new Date(run.createdAt).toLocaleString()}
          </p>
          <p style={{ color: "rgba(100,116,139,0.3)", fontSize: 11, margin: 0 }}>
            Calculation aid only · Engineer of record must verify all results
          </p>
        </div>
      </div>
    </div>
  );
}
