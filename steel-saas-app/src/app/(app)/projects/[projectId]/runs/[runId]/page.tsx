import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { designResultSchema } from "../../../../../../domain/resultContract";

type Props = { params: Promise<{ projectId: string; runId: string }> };

const s = {
  page:   { padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "720px", margin: "0 auto" } as const,
  back:   { display: "inline-block", marginBottom: "1.25rem", fontSize: "0.875rem", color: "#6b7280", textDecoration: "none" } as const,
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" } as const,
  h1:     { margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#111827" } as const,
  meta:   { fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.25rem" } as const,
  badge:  (pass: boolean) => ({ display: "inline-block", padding: "0.375rem 1rem", borderRadius: "99px", fontWeight: 700, fontSize: "0.9375rem", background: pass ? "#dcfce7" : "#fee2e2", color: pass ? "#15803d" : "#dc2626" }) as const,
  card:   { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1.25rem", marginBottom: "1rem" } as const,
  sh:     { fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "#6b7280", marginBottom: "0.75rem" },
  row:    { display: "flex", justifyContent: "space-between", padding: "0.375rem 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.875rem" } as const,
  label:  { color: "#6b7280" } as const,
  val:    { fontWeight: 500, color: "#111827" } as const,
  calc:   { fontFamily: "Courier, monospace", fontSize: "0.8125rem", color: "#374151", lineHeight: 1.6 } as const,
  warn:   { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#92400e", marginBottom: "1rem" } as const,
  dlBtn:  { display: "inline-block", padding: "0.5rem 1rem", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "0.875rem", color: "#374151", textDecoration: "none", fontWeight: 500 } as const,
};

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={s.row}>
      <span style={s.label}>{label}</span>
      <span style={s.val}>{String(value)}</span>
    </div>
  );
}

function DCRRow({ label, dcr }: { label: string; dcr: number }) {
  const pass = dcr <= 1.0;
  return (
    <div style={{ ...s.row, background: pass ? "transparent" : "#fff7f7" }}>
      <span style={s.label}>{label}</span>
      <span style={{ ...s.val, color: pass ? "#15803d" : "#dc2626" }}>
        {dcr.toFixed(3)} {pass ? "✓" : "✗"}
      </span>
    </div>
  );
}

export default async function RunResultPage({ params }: Props) {
  const { projectId, runId } = await params;
  const session = await auth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = await (prisma as any).designRun.findFirst({
    where: { id: runId, project: { id: projectId, organizationId: session!.user.organizationId } },
    include: { project: { select: { name: true } } },
  });

  if (!run) notFound();

  const parsed = designResultSchema.safeParse(run.resultJson);
  const result = parsed.success ? parsed.data : null;
  const dr = result?.displayResults ?? {};
  const pass = Boolean(dr.pass);

  const typeLabel: Record<string, string> = {
    beam: "Beam", column: "Column", base_plate: "Base Plate",
  };

  return (
    <main style={s.page}>
      <Link href={`/projects/${projectId}`} style={s.back}>← {run.project.name}</Link>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>{run.title}</h1>
          <div style={s.meta}>
            {typeLabel[run.type] ?? run.type} · {run.status} ·{" "}
            {new Date(run.createdAt).toLocaleString()}
          </div>
        </div>
        {result && (
          <span style={s.badge(pass)}>{pass ? "PASS" : "FAIL"}</span>
        )}
      </div>

      {/* No result yet (draft / failed) */}
      {!result && (
        <div style={{ ...s.card, color: "#6b7280" }}>
          {run.status === "failed"
            ? `Calculation failed: ${run.errorCode ?? "ENGINE_ERROR"}`
            : "No result available."}
        </div>
      )}

      {result && (
        <>
          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div style={s.warn}>
              <strong>Warnings</strong>
              {result.warnings.map((w, i) => <div key={i}>• {w}</div>)}
            </div>
          )}

          {/* Input summary */}
          <div style={s.card}>
            <div style={s.sh}>Inputs (from result record)</div>
            {Object.values(result.displayInputSnapshot).map((entry, i) => (
              <Row key={i} label={entry.label} value={`${entry.value} ${entry.unit}`} />
            ))}
          </div>

          {/* Governing checks */}
          <div style={s.card}>
            <div style={s.sh}>Governing checks</div>

            {/* Beam */}
            {result.moduleType === "beam" && (
              <>
                <DCRRow label="Moment DCR" dcr={dr.momentDCR as number} />
                <DCRRow label="Shear DCR"  dcr={dr.shearDCR  as number} />
                <Row label="Design moment capacity" value={`${(dr.designMomentCapacity as number)?.toFixed(1)}`} />
                <Row label="Design shear capacity"  value={`${(dr.designShearCapacity  as number)?.toFixed(1)}`} />
              </>
            )}

            {/* Column */}
            {result.moduleType === "column" && (
              <>
                <DCRRow label="Demand / Capacity" dcr={dr.demandCapacityRatio as number} />
                <Row label="KL/r (slenderness)"       value={(dr.slenderness           as number)?.toFixed(1)} />
                <Row label="Elastic buckling stress"  value={(dr.fe                    as number)?.toFixed(1)} />
                <Row label="Critical stress"          value={(dr.fcr                   as number)?.toFixed(1)} />
                <Row label="Factored resistance"      value={(dr.factoredResistance    as number)?.toFixed(1)} />
              </>
            )}

            {/* Base plate */}
            {result.moduleType === "base_plate" && (
              <>
                <Row label="Bearing area — required" value={(dr.a1Required as number)?.toFixed(0)} />
                <Row label="Bearing area — supplied" value={String(dr.a1Supplied)} />
                <Row label="Bearing check" value={dr.bearingAreaPass ? "PASS ✓" : "FAIL ✗"} />
                <Row label="Governing cantilever" value={`${dr.governingCantilever} = ${(dr.lGoverning as number)?.toFixed(2)}`} />
                <Row label="Required plate thickness" value={`${(dr.tpRequired as number)?.toFixed(2)}`} />
              </>
            )}
          </div>

          {/* Calculation lines */}
          {result.calculationLines.length > 0 && (
            <div style={s.card}>
              <div style={s.sh}>Calculation</div>
              <div style={s.calc}>
                {result.calculationLines.map((line, i) => <div key={i}>{line}</div>)}
              </div>
            </div>
          )}

          {/* Code references */}
          <div style={s.card}>
            <div style={s.sh}>Code clause references</div>
            {result.codeReferences.map((ref, i) => (
              <div key={i} style={{ fontSize: "0.875rem", color: "#374151" }}>• {ref}</div>
            ))}
          </div>

          {/* Footer: engine version + PDF */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              Engine {result.engineVersion} · Section DB {result.sectionDbVersion}
            </span>
            <a
              href={`/api/design-runs/${runId}/report`}
              target="_blank"
              rel="noopener noreferrer"
              style={s.dlBtn}
            >
              ↓ Download PDF
            </a>
          </div>
        </>
      )}
    </main>
  );
}
