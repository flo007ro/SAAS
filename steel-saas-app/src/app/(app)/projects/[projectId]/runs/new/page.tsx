import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import RunForm from "./RunForm";

export default async function NewRunPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user?.userId) redirect("/login");
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.user.organizationId, archivedAt: null },
    select: { id: true, name: true, codeProfile: true, unitSystem: true },
  });
  if (!project) notFound();
  return <RunForm key={`${project.id}:${project.codeProfile}:${project.unitSystem}`} projectId={project.id} projectName={project.name}
    codeProfile={project.codeProfile} unitSystem={project.unitSystem} />;
}
