import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";
import MeshBackground from "@/components/MeshBackground";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { organizationId: session.user.organizationId, archivedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      designRuns: {
        where: { status: { not: "superseded" } },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, type: true },
      },
    },
  });

  const sidebarProjects = projects.map(p => ({
    id: p.id,
    name: p.name,
    codeProfile: p.codeProfile,
    runs: p.designRuns,
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#050a12", position: "relative" }}>
      <MeshBackground />
      <Sidebar projects={sidebarProjects} />
      <main style={{
        marginLeft: 240,
        minHeight: "100vh",
        position: "relative",
        zIndex: 10,
        padding: "32px 40px",
      }}>
        {children}
      </main>
    </div>
  );
}
