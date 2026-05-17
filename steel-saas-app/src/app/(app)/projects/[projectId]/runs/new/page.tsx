import { notFound } from "next/navigation";
import { auth } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { sectionSeedV1 } from "../../../../../../domain/sections/sectionSeed.v1";
import RunForm from "./RunForm";

type Props = { params: Promise<{ projectId: string }> };

export default async function NewRunPage({ params }: Props) {
  const { projectId } = await params;
  const session = await auth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = await (prisma as any).project.findFirst({
    where: { id: projectId, organizationId: session!.user.organizationId, archivedAt: null },
    select: { id: true, name: true, codeProfile: true, unitSystem: true },
  });

  if (!project) notFound();

  // Filter seed sections to those matching this project's standard
  const availableSections = sectionSeedV1
    .filter((s) => s.standard === project.codeProfile)
    .sort((a, b) => a.weightOrMass - b.weightOrMass)
    .map((s) => s.designation);

  return (
    <RunForm
      projectId={project.id}
      projectName={project.name}
      unitSystem={project.unitSystem as "metric" | "imperial"}
      codeProfile={project.codeProfile as string}
      availableSections={availableSections}
    />
  );
}
