import Link from "next/link";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

const styles = {
  page: { padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "800px", margin: "0 auto" } as const,
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" } as const,
  h1: { margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#111827" } as const,
  btn: { padding: "0.5rem 1rem", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", textDecoration: "none" } as const,
  card: { display: "block", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "1rem 1.25rem", marginBottom: "0.75rem", textDecoration: "none", color: "inherit" } as const,
  cardTitle: { fontWeight: 600, color: "#111827", marginBottom: "0.25rem" } as const,
  cardMeta: { fontSize: "0.8125rem", color: "#6b7280" } as const,
  empty: { color: "#6b7280", fontSize: "0.9375rem", marginTop: "2rem" } as const,
};

export default async function ProjectsPage() {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects: any[] = await (prisma as any).project.findMany({
    where: { organizationId: session!.user.organizationId, archivedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, client: true, location: true, codeProfile: true, unitSystem: true, createdAt: true },
  });

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.h1}>Projects</h1>
        <Link href="/projects/new" style={styles.btn}>New project</Link>
      </div>

      {projects.length === 0 ? (
        <p style={styles.empty}>No projects yet — <Link href="/projects/new">create your first one</Link>.</p>
      ) : (
        projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} style={styles.card}>
            <div style={styles.cardTitle}>{p.name}</div>
            <div style={styles.cardMeta}>
              {p.client} · {p.location} · {p.codeProfile.replace("_", " ")} · {p.unitSystem}
            </div>
          </Link>
        ))
      )}
    </main>
  );
}
