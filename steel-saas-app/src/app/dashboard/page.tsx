 
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");

  return (
    <div style={{ padding: "40px" }}>
      <h1 style={{ color: "#e0f2fe", fontSize: 24, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: "rgba(148,163,184,0.7)", fontFamily: "monospace", marginBottom: 32 }}>
        Welcome back
      </p>
      <Link href="/projects/new" style={{
        background: "rgba(56,189,248,0.1)",
        border: "1px solid rgba(56,189,248,0.3)",
        borderRadius: 8,
        padding: "10px 20px",
        color: "#38bdf8",
        textDecoration: "none",
        fontFamily: "monospace",
        fontSize: 13,
      }}>
        + New Project
      </Link>
    </div>
  );
}