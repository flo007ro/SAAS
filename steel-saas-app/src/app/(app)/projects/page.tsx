import Link from "next/link";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

const styles = {
  page:      { padding: "2rem", fontFamily: "system-ui, sans-serif", maxWidth: "800px", margin: "0 auto" } as const,
  header:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" } as const,
  h1:        { margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#111827" } as const,
  btn:       { padding: "0.5rem 1rem", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", textDecoration: "none" } as const,
  card:      { display: "block", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "1rem 1.25rem", marginBottom: "0.75rem", textDecoration: "none", color: "inherit" } as const,
  cardTitle: { fontWeight: 600, color: "#111827", marginBottom: "0.25rem" } as const,
  cardMeta:  { fontSize: "0.8125rem", color: "#6b7280" } as const,
  empty:     { color: "#6b7280", fontSize: "0.9375rem", marginTop: "2rem" } as const,
  banner:    { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "0.875rem 1.25rem", marginBottom: "1.5rem", fontSize: "0.875rem", color: "#92400e" } as const,
  bannerBtn: { padding: "0.4rem 1rem", background: "#d97706", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const } as const,
  manageBtn: { padding: "0.4rem 1rem", background: "transparent", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const } as const,
};

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ subscribed?: string }> }) {
  const session = await auth();
  const orgId = session!.user.organizationId;

  const [projects, org] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).project.findMany({
      where: { organizationId: orgId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, client: true, location: true, codeProfile: true, unitSystem: true, createdAt: true },
    }) as Promise<any[]>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).organization.findUnique({
      where: { id: orgId },
      select: { subscriptionStatus: true, stripeCustomerId: true },
    }) as Promise<{ subscriptionStatus: string; stripeCustomerId: string | null } | null>,
  ]);

  const { subscribed } = await searchParams;
  const isActive = org?.subscriptionStatus === "active";
  const hasCustomer = Boolean(org?.stripeCustomerId);

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.h1}>Projects</h1>
        <Link href="/projects/new" style={styles.btn}>New project</Link>
      </div>

      {/* Subscription banner */}
      {subscribed === "1" && isActive && (
        <div style={{ ...styles.banner, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" }}>
          <span>Subscription active — you can now run calculations.</span>
        </div>
      )}
      {!isActive && (
        <div style={styles.banner}>
          <span>A subscription is required to run calculations. You are currently on the beta plan.</span>
          <form action="/api/stripe/checkout" method="POST">
            <button type="submit" style={styles.bannerBtn}>Subscribe</button>
          </form>
        </div>
      )}
      {isActive && hasCustomer && subscribed !== "1" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <form action="/api/stripe/portal" method="POST">
            <button type="submit" style={styles.manageBtn}>Manage subscription</button>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <p style={styles.empty}>No projects yet — <Link href="/projects/new">create your first one</Link>.</p>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        projects.map((p: any) => (
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
