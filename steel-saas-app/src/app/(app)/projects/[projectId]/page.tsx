import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

type Props = { params: Promise<{ projectId: string }> };

const STATUS_LABEL: Record<string, string> = {
  draft:       "Draft",
  calculating: "Calculating…",
  complete:    "Complete",
  failed:      "Failed",
  superseded:  "Superseded",
};

const STATUS_COLOR: Record<string, string> = {
  draft:       "#6b7280",
  calculating: "#d97706",
  complete:    "#15803d",
  failed:      "#dc2626",
  superseded:  "#9ca3af",
};

const s = {
  page:   { padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "800px", margin: "0 auto" } as const,
  back:   { display: "inline-block", marginBottom: "1.25rem", fontSize: "0.875rem", color: "#6b7280", textDecoration: "none" } as const,
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" } as const,
  h1:     { margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#111827" } as const,
  meta:   { fontSize: "0.875rem", color: "#6b7280", marginBottom: "2rem" } as const,
  section:{ marginTop: "1.5rem" } as const,
  sh:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" } as const,
  h2:     { margin: 0, fontSize: "1.0625rem", fontWeight: 600, color: "#111827" } as const,
  btn:    { padding: "0.4rem 0.875rem", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", textDecoration: "none" } as const,
  run:    { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.875rem 1rem", marginBottom: "0.5rem", textDecoration: "none", color: "inherit" } as const,
  runTitle:{ fontWeight: 500, color: "#111827", fontSize: "0.9375rem" } as const,
  runMeta: { fontSize: "0.8125rem", color: "#6b7280" } as const,
  empty:  { color: "#6b7280", fontSize: "0.9375rem", padding: "1.5rem", background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: "6px", textAlign: "center" } as const,
};

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params;
  const session = await auth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = await (prisma as any).project.findFirst({
    where: { id: projectId, organizationId: session!.user.organizationId },
    include: {
      designRuns: {
        where: { status: { not: "superseded" } },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, type: true, status: true, createdAt: true },
      },
    },
  });

  if (!project) notFound();

  const codeLabel = project.codeProfile === "CSA_S16_19" ? "CSA S16-19" : "AISC 360-22";
  const unitLabel = project.unitSystem === "metric" ? "Metric" : "Imperial";

  return (
    <main style={s.page}>
      <Link href="/projects" style={s.back}>← Projects</Link>

      <div style={s.header}>
        <h1 style={s.h1}>{project.name}</h1>
      </div>
      <p style={s.meta}>
        {project.client !== "—" && <>{project.client} · </>}
        {project.location !== "—" && <>{project.location} · </>}
        {codeLabel} · {unitLabel}
      </p>

      <section style={s.section}>
        <div style={s.sh}>
          <h2 style={s.h2}>Design runs</h2>
          <Link href={`/projects/${projectId}/runs/new`} style={s.btn}>
            New run
          </Link>
        </div>

        {project.designRuns.length === 0 ? (
          <div style={s.empty}>
            No runs yet —{" "}
            <Link href={`/projects/${projectId}/runs/new`}>create one</Link>
          </div>
        ) : (
          project.designRuns.map((run: { id: string; title: string; type: string; status: string; createdAt: Date }) => (
            <div key={run.id} style={s.run}>
              <div>
                <div style={s.runTitle}>{run.title}</div>
                <div style={s.runMeta}>
                  {run.type.replace("_", " ")} · {new Date(run.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span style={{ fontSize: "0.8125rem", fontWeight: 500, color: STATUS_COLOR[run.status] ?? "#6b7280" }}>
                {STATUS_LABEL[run.status] ?? run.status}
              </span>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
