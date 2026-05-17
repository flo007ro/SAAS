import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { designResultSchema, type DesignResult } from "../../../../../../domain/resultContract";
import { sectionSeedV1 } from "../../../../../../domain/sections/sectionSeed.v1";

type Props = { params: Promise<{ projectId: string; runId: string }> };

// ── style tokens ─────────────────────────────────────────────────────────────

const T = {
  page:    { padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "740px", margin: "0 auto" } as const,
  back:    { display: "inline-block", marginBottom: "1.25rem", fontSize: "0.875rem", color: "#6b7280", textDecoration: "none" } as const,
  card:    { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1.25rem 1.5rem", marginBottom: "1rem" } as const,
  cardSh:  { fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "#9ca3af", marginBottom: "0.875rem" },
  row:     { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0.375rem 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.875rem", gap: "1rem" } as const,
  rowLast: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0.375rem 0", fontSize: "0.875rem", gap: "1rem" } as const,
  lbl:     { color: "#6b7280", flexShrink: 0 } as const,
  val:     { fontWeight: 500, color: "#111827", textAlign: "right" as const } as const,
  mono:    { fontFamily: "Courier, monospace", fontSize: "0.8125rem", color: "#374151", lineHeight: 1.7 } as const,
  notice:  { borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem", marginBottom: "1rem" } as const,
  badge:   (pass: boolean) =>
    ({ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 1rem", borderRadius: "99px", fontWeight: 700, fontSize: "1rem", background: pass ? "#dcfce7" : "#fee2e2", color: pass ? "#15803d" : "#dc2626" }) as const,
  dcrVal:  (pass: boolean) =>
    ({ fontWeight: 700, color: pass ? "#15803d" : "#dc2626", textAlign: "right" as const }) as const,
};

// ── small components ─────────────────────────────────────────────────────────

function SH({ children }: { children: React.ReactNode }) {
  return <div style={T.cardSh}>{children}</div>;
}

function R({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div style={last ? T.rowLast : T.row}>
      <span style={T.lbl}>{label}</span>
      <span style={T.val}>{value}</span>
    </div>
  );
}

function DCR({ label, dcr }: { label: string; dcr: number }) {
  const pass = dcr <= 1.0;
  return (
    <div style={{ ...T.row, background: pass ? "transparent" : "#fff7f7" }}>
      <span style={T.lbl}>{label}</span>
      <span style={T.dcrVal(pass)}>
        {dcr.toFixed(3)} {pass ? "✓" : "✗"}
      </span>
    </div>
  );
}

// ── units helper ─────────────────────────────────────────────────────────────

function units(us: "metric" | "imperial") {
  return us === "metric"
    ? { force: "kN", moment: "kN·m", length: "mm", area: "mm²", pressure: "MPa", stress: "MPa" }
    : { force: "kip", moment: "kip·ft", length: "in", area: "in²", pressure: "ksi", stress: "ksi" };
}

// ── module-type label ─────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  beam: "Beam", column: "Column", base_plate: "Base plate",
};

// ── demand/capacity section ───────────────────────────────────────────────────

function DemandCapacitySection({ result }: { result: DesignResult }) {
  const snap = result.displayInputSnapshot;
  const dr   = result.displayResults;
  const u    = units(result.unitSystem);

  const snap_ = (key: string) => snap[key];
  const dr_   = (key: string) => dr[key] as number;

  if (result.moduleType === "beam") {
    const mf  = snap_("factoredMoment");
    const vf  = snap_("factoredShear");
    return (
      <>
        {/* Moment */}
        <div style={{ marginBottom: "0.75rem" }}>
          <R label={`Factored moment ${mf ? `(${mf.label})` : ""}`} value={mf ? `${mf.value} ${u.moment}` : "—"} />
          <R label={`Moment capacity φMn`}                           value={`${dr_("designMomentCapacity")?.toFixed(1)} ${u.moment}`} />
          <DCR label="Moment DCR" dcr={dr_("momentDCR")} />
        </div>
        {/* Shear */}
        <div>
          <R label={`Factored shear ${vf ? `(${vf.label})` : ""}`} value={vf ? `${vf.value} ${u.force}` : "—"} />
          <R label={`Shear capacity φVn`}                           value={`${dr_("designShearCapacity")?.toFixed(1)} ${u.force}`} />
          <DCR label="Shear DCR" dcr={dr_("shearDCR")} />
        </div>
      </>
    );
  }

  if (result.moduleType === "column") {
    const cf = snap_("factoredCompression");
    const kl = snap_("effectiveLength");
    return (
      <>
        <R label={`Factored axial ${cf ? `(${cf.label})` : ""}`} value={cf ? `${cf.value} ${u.force}` : "—"} />
        <R label={`Effective length KL`}                          value={kl ? `${kl.value} ${u.length}` : "—"} />
        <R label="Slenderness KL/r"                               value={dr_("slenderness")?.toFixed(1)} />
        <R label={`Elastic buckling stress Fe`}                   value={`${dr_("fe")?.toFixed(1)} ${u.stress}`} />
        <R label={`Critical stress Fcr`}                          value={`${dr_("fcr")?.toFixed(1)} ${u.stress}`} />
        <R label={`Axial capacity φCr / φCn`}                     value={`${dr_("factoredResistance")?.toFixed(1)} ${u.force}`} />
        <DCR label="Demand / capacity ratio" dcr={dr_("demandCapacityRatio")} />
      </>
    );
  }

  if (result.moduleType === "base_plate") {
    const pu = snap_("factoredCompression");
    return (
      <>
        <R label={`Factored axial ${pu ? `(${pu.label})` : ""}`}     value={pu ? `${pu.value} ${u.force}` : "—"} />
        <R label={`Required bearing area A₁`}                         value={`${dr_("a1Required")?.toFixed(0)} ${u.area}`} />
        <R label={`Supplied bearing area N×B`}                        value={`${(dr_("a1Supplied") as number)?.toFixed(0)} ${u.area}`} />
        <R label="Bearing check" value={
          <span style={{ fontWeight: 600, color: dr.bearingAreaPass ? "#15803d" : "#dc2626" }}>
            {dr.bearingAreaPass ? "PASS ✓" : "FAIL ✗"}
          </span>
        } />
        <DCR label="Bearing DCR" dcr={dr_("bearingDCR")} />
        <R label="Governing cantilever"        value={`${dr.governingCantilever} = ${dr_("lGoverning")?.toFixed(2)} ${u.length}`} />
        <R label="Required plate thickness tₚ" value={`${dr_("tpRequired")?.toFixed(2)} ${u.length}`} last />
      </>
    );
  }

  return null;
}

// ── section properties ────────────────────────────────────────────────────────

function SectionPropertiesSection({ result }: { result: DesignResult }) {
  const snap  = result.displayInputSnapshot;
  const desig = (snap.selectedSection ?? snap.columnSection)?.value as string | undefined;
  const sec   = desig ? sectionSeedV1.find((s) => s.designation === desig) : null;
  const u     = units(result.unitSystem);

  if (!sec) {
    return <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Section "{desig}" not found in local database.</p>;
  }

  return (
    <>
      <R label="Designation" value={`${sec.designation} (${sec.standard.replace("_", " ")})`} />
      <R label={`Area A`}            value={`${sec.area} ${u.area}`} />
      <R label={`Depth d`}           value={`${sec.depth} ${u.length}`} />
      <R label={`Flange width bf`}   value={`${sec.flangeWidth} ${u.length}`} />
      <R label={`Flange thickness tf`} value={`${sec.flangeThickness} ${u.length}`} />
      <R label={`Web thickness tw`}  value={`${sec.webThickness} ${u.length}`} />
      <R label={`Elastic Sx`}        value={`${sec.sx.toLocaleString()} ${u.area === "mm²" ? "mm³" : "in³"}`} />
      <R label={`Weak-axis radius ry`} value={`${sec.ry} ${u.length}`} last />
    </>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function RunResultPage({ params }: Props) {
  const { projectId, runId } = await params;
  const session = await auth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = await (prisma as any).designRun.findFirst({
    where: {
      id: runId,
      project: { id: projectId, organizationId: session!.user.organizationId },
    },
    include: { project: { select: { name: true, codeProfile: true, unitSystem: true } } },
  });

  if (!run) notFound();

  // If superseded, find the run that replaced it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supersedingRun: { id: string; title: string } | null =
    run.status === "superseded"
      ? await (prisma as any).designRun.findFirst({
          where: { supersedesDesignRunId: runId, projectId },
          select: { id: true, title: true },
        })
      : null;

  const parsed  = designResultSchema.safeParse(run.resultJson);
  const result  = parsed.success ? parsed.data : null;
  const pass    = result ? Boolean(result.displayResults.pass) : false;

  const codeLabel = run.project.codeProfile === "CSA_S16_19" ? "CSA S16-19" : "AISC 360-22";
  const unitLabel = run.project.unitSystem === "metric" ? "Metric" : "Imperial";
  const typeLabel = TYPE_LABEL[run.type as string] ?? run.type;

  const canShowDetail = result && run.status === "complete";

  return (
    <main style={T.page}>
      <Link href={`/projects/${projectId}`} style={T.back}>← {run.project.name}</Link>

      {/* ── 1. Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
            {run.title}
          </h1>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            {typeLabel} · {codeLabel} · {unitLabel}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#9ca3af", marginTop: "0.125rem" }}>
            {new Date(run.createdAt).toLocaleString()}
          </div>
        </div>
        {canShowDetail && (
          <span style={T.badge(pass)}>{pass ? "✓ PASS" : "✗ FAIL"}</span>
        )}
      </div>

      {/* ── Superseded notice ───────────────────────────────────────────────── */}
      {run.status === "superseded" && (
        <div style={{ ...T.notice, background: "#f3f4f6", border: "1px solid #d1d5db", color: "#374151" }}>
          This run has been superseded by a newer calculation for the same section.
          {supersedingRun && (
            <> <Link href={`/projects/${projectId}/runs/${supersedingRun.id}`} style={{ color: "#1d4ed8" }}>View newer run: {supersedingRun.title}</Link></>
          )}
        </div>
      )}

      {/* ── Failed notice ───────────────────────────────────────────────────── */}
      {run.status === "failed" && (
        <div style={{ ...T.card, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a" }}>
          <strong>Calculation did not complete.</strong>
          <div style={{ marginTop: "0.25rem", fontSize: "0.875rem" }}>
            Error code: <code>{run.errorCode ?? "ENGINE_ERROR"}</code>
          </div>
        </div>
      )}

      {/* ── Draft / calculating ─────────────────────────────────────────────── */}
      {!result && run.status !== "failed" && run.status !== "superseded" && (
        <div style={{ ...T.card, color: "#6b7280" }}>Calculation did not complete.</div>
      )}

      {canShowDetail && (
        <>
          {/* ── 4. Warnings ─────────────────────────────────────────────────── */}
          {result.warnings.length > 0 ? (
            <div style={{ ...T.notice, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
              <strong style={{ display: "block", marginBottom: "0.375rem" }}>Warnings</strong>
              {result.warnings.map((w, i) => (
                <div key={i} style={{ padding: "0.125rem 0" }}>• {w}</div>
              ))}
            </div>
          ) : (
            <div style={{ ...T.notice, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" }}>
              No warnings.
            </div>
          )}

          {/* ── 2. Demand / capacity ────────────────────────────────────────── */}
          <div style={T.card}>
            <SH>Demand / capacity</SH>
            <DemandCapacitySection result={result} />
          </div>

          {/* ── 3. Section properties ───────────────────────────────────────── */}
          <div style={T.card}>
            <SH>Section properties used</SH>
            <SectionPropertiesSection result={result} />
          </div>

          {/* Calculation lines (collapsible detail) */}
          {result.calculationLines.length > 0 && (
            <details style={{ marginBottom: "1rem" }}>
              <summary style={{ cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, color: "#374151", padding: "0.75rem 1.25rem", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                Calculation lines
              </summary>
              <div style={{ ...T.card, marginTop: "0.25rem", marginBottom: 0, ...T.mono }}>
                {result.calculationLines.map((line, i) => <div key={i}>{line}</div>)}
              </div>
            </details>
          )}

          {/* ── 5. Code clause references ───────────────────────────────────── */}
          <div style={T.card}>
            <SH>Code clause references</SH>
            {result.codeReferences.map((ref, i) => (
              <div key={i} style={{ fontSize: "0.875rem", color: "#374151", padding: "0.25rem 0" }}>
                {ref}
              </div>
            ))}
          </div>

          {/* ── 6. Engine metadata + 7. PDF ─────────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af", lineHeight: 1.6 }}>
              <div>Engine: {result.engineVersion}</div>
              <div>Section DB: {result.sectionDbVersion}</div>
              <div>Calculated: {new Date(run.createdAt).toLocaleString()}</div>
            </div>
            <a
              href={`/api/design-runs/${runId}/report`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", padding: "0.5rem 1.25rem", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}
            >
              ↓ Download PDF
            </a>
          </div>
        </>
      )}
    </main>
  );
}
