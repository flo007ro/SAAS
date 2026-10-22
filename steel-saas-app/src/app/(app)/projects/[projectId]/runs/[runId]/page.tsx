import ProfileViewer from "@/components/profiles/ProfileViewer";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

function Row({ label, value, highlight }: { label: string; value: string; highlight?: "pass" | "fail" | null }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid rgba(148,174,191,0.06)",
    }}>
      <span style={{ color: "rgba(148,163,184,0.7)", fontSize: 13 }}>{label}</span>
      <span style={{
        fontSize: 13,
        fontFamily: "monospace",
        fontWeight: highlight ? 600 : 400,
        color: highlight === "pass" ? "#34d399" : highlight === "fail" ? "#f87171" : "#e8edf0",
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
      background: "rgba(22,28,34,0.75)",
      border: "1px solid rgba(148,174,191,0.1)",
      borderRadius: 12,
      padding: "24px",
      backdropFilter: "blur(12px)",
      marginBottom: 16,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(148,174,191,0.2), transparent)" }} />
      <div style={{ fontSize: 11, color: "rgba(148,174,191,0.5)", fontFamily: "monospace", letterSpacing: "0.1em", marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default async function RunResultPage({ params }: { params: Promise<{ projectId: string; runId: string }> }) {
  const { projectId, runId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const run = await prisma.designRun.findFirst({
    where: { id: runId, projectId, project: { organizationId: session.user.organizationId } },
    include: { project: true },
  });

  if (!run) notFound();

  const result = run.resultJson as any;
  const display = result?.displayResults ?? {};
  const snapshot = result?.displayInputSnapshot ?? {};
  const section = result?.sectionSnapshot ?? {};
  const warnings = result?.warnings ?? [];
  const codeRefs = result?.codeReferences ?? [];
  const overallPass = display.pass;

  const typeLabel: Record<string, string> = { beam: "Beam", column: "Column", base_plate: "Base Plate", brace: "Brace member checks" };

  return (
    <div style={{ minHeight: "100vh", background: "transparent", position: "relative" }}>
      <div style={{ position: "relative", zIndex: 10, padding: "48px 56px", maxWidth: 860 }}>

        {/* Back */}
        <Link href={`/projects/${run.projectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(148,174,191,0.5)", fontSize: 12, fontFamily: "monospace", textDecoration: "none", marginBottom: 32 }}>
          ← {run.project.name}
        </Link>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, color: "#e8edf0", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              {run.title}
            </h1>
            <p style={{ color: "rgba(148,163,184,0.5)", fontSize: 12, fontFamily: "monospace", margin: 0 }}>
              {typeLabel[run.type] ?? run.type} · {(result?.codeProfile ?? run.project.codeProfile) === "AISC_360_22" ? "AISC 360-22" : "CSA S16-19"} · {result?.unitSystem ?? run.project.unitSystem}
            </p>
          </div>
          {run.status === "complete" && result && (
            <div style={{
              background: run.type === "brace" ? "rgba(251,191,36,0.08)" : overallPass ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
              border: `1px solid ${run.type === "brace" ? "rgba(251,191,36,0.3)" : overallPass ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
              borderRadius: 10,
              padding: "12px 20px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: run.type === "brace" ? "#fbbf24" : overallPass ? "#34d399" : "#f87171", fontFamily: "monospace", letterSpacing: "0.05em" }}>
                {run.type === "brace" ? "REVIEW REQUIRED" : overallPass ? (run.type === "base_plate" ? "✓ BEARING PASS" : "✓ CHECKS PASS") : "✗ CHECKS FAIL"}
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
              {run.type === "brace" && <>
                <Row label="Assessment" value="Preliminary member checks; engineering review required" />
                <Row label="Calculated strength/slenderness screens" value={(display.calculatedChecksMet ?? display.pass) ? "Met within stated scope" : "Not met"} />
                <Row label="Factored tension" value={`${snapshot.factoredTension?.value ?? "—"} ${snapshot.factoredTension?.unit ?? ""}`} />
                <Row label="Gross yielding resistance" value={`${display.grossYieldResistance ?? "—"} ${snapshot.factoredTension?.unit ?? ""}`} />
                <Row label="Effective-net-area rupture resistance" value={`${display.netRuptureResistance ?? "—"} ${snapshot.factoredTension?.unit ?? ""}`} />
                <Row label="Tension DCR" value={String(display.tensionDCR ?? "—")} />
                <Row label="Factored compression" value={`${snapshot.factoredCompression?.value ?? "—"} ${snapshot.factoredCompression?.unit ?? ""}`} />
                <Row label="Flexural buckling resistance" value={`${display.compressionResistance ?? "—"} ${snapshot.factoredCompression?.unit ?? ""}`} />
                <Row label="Compression DCR" value={String(display.compressionDCR ?? "—")} />
                <Row label="Governing buckling axis" value={String(display.governingCompressionAxis ?? "—")} />
                <Row label="Strong / weak KL/r" value={`${display.strongAxisKLr ?? "—"} / ${display.weakAxisKLr ?? "—"}`} />
                <Row label="Seismic qualification" value="Not evaluated" />
              </>}
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
                  <Row label="Axial capacity φCr" value={`${display.factoredResistance ?? "—"} ${snapshot.factoredCompression?.unit ?? ""}`} />
                  <Row label="Slenderness KL/r" value={display.slenderness?.toFixed(1) ?? "—"} />
                  <Row
                    label="DCR"
                    value={display.demandCapacityRatio != null ? display.demandCapacityRatio.toFixed(3) : "—"}
                    highlight={display.demandCapacityRatio != null ? (display.demandCapacityRatio <= 1 ? "pass" : "fail") : null}
                  />
                </>
              )}
              {run.type === "base_plate" && (
                <>
                  <Row label="Factored compression (P_u)" value={`${snapshot.factoredCompression?.value ?? "—"} ${snapshot.factoredCompression?.unit ?? ""}`} />
                  <Row label="Required bearing area" value={`${display.a1Required ?? "—"} ${result?.unitSystem === "metric" ? "mm²" : "in²"}`} />
                  <Row label="Governing cantilever" value={display.governingCantilever ?? "—"} />
                  <Row label="Required plate thickness t_p" value={`${display.tpRequired ?? "—"} ${result?.unitSystem === "metric" ? "mm" : "in"}`} />
                  <Row
                    label="Bearing DCR"
                    value={display.bearingDCR != null ? display.bearingDCR.toFixed(3) : "—"}
                    highlight={display.bearingDCR != null ? (display.bearingDCR <= 1 ? "pass" : "fail") : null}
                  />
                </>
              )}
            </Card>

            {section.designation && <div style={{ marginBottom: 16 }}><ProfileViewer profile={{
              designation: section.designation, unitSystem: result.unitSystem,
              depth: section.d, flangeWidth: section.bf, webThickness: section.tw, flangeThickness: section.tf,
            }} standard={result.codeProfile === "AISC_360_22" ? "AISC · W-shape" : "CSA · W-shape"} /></div>}

            {/* Section properties */}
            {section.designation && (
              <Card title="SECTION PROPERTIES USED">
                <Row label="Designation" value={section.designation} />
                {section.A && <Row label="Area A" value={`${section.A} ${(result?.unitSystem ?? run.project.unitSystem) === "metric" ? "mm²" : "in²"}`} />}
                {section.d && <Row label="Depth d" value={`${section.d} ${(result?.unitSystem ?? run.project.unitSystem) === "metric" ? "mm" : "in"}`} />}
                {section.bf && <Row label="Flange width bf" value={`${section.bf} ${(result?.unitSystem ?? run.project.unitSystem) === "metric" ? "mm" : "in"}`} />}
                {section.Sx && <Row label="Elastic section modulus Sx" value={`${section.Sx} ${(result?.unitSystem ?? run.project.unitSystem) === "metric" ? "mm³" : "in³"}`} />}
                {section.ry && <Row label="Weak-axis ry" value={`${section.ry} ${(result?.unitSystem ?? run.project.unitSystem) === "metric" ? "mm" : "in"}`} />}
                {section.Fy && <Row label="Yield strength Fy" value={`${section.Fy} ${(result?.unitSystem ?? run.project.unitSystem) === "metric" ? "MPa" : "ksi"}`} />}
              </Card>
            )}

            <Card title="CALCULATION DETAILS">
              {(result.calculationLines ?? []).map((line: string, i: number) => <p key={i} style={{ color: "#cbd5e1", lineHeight: 1.6, overflowWrap: "anywhere" }}>{line}</p>)}
            </Card>

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
                  background: "linear-gradient(135deg, rgba(148,174,191,0.15), rgba(148,174,191,0.08))",
                  border: "1px solid rgba(148,174,191,0.35)",
                  borderRadius: 8,
                  padding: "11px 24px",
                  color: "#b2c6d0",
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
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid rgba(148,174,191,0.06)" }}>
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