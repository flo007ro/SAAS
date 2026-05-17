"use server";

import { redirect } from "next/navigation";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { handleCreateProject } from "../../../api/projects/handler";
import { buildProjectDeps } from "../../../api/projects/prismaProjectDeps";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

export async function createProjectAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.userId) return { error: "Not authenticated." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = await (prisma as any).organization.findUnique({
    where: { id: session.user.organizationId },
    select: { subscriptionStatus: true },
  });

  const body = {
    name: formData.get("name"),
    // client/location optional in the form — default to dash so the
    // non-nullable DB column and z.string().min(1) constraint are satisfied
    client:   (formData.get("client")   as string)?.trim() || "—",
    location: (formData.get("location") as string)?.trim() || "—",
    codeProfile: formData.get("codeProfile"),
    unitSystem:  formData.get("unitSystem"),
  };

  const result = await handleCreateProject(
    body,
    { userId: session.user.userId, organizationId: session.user.organizationId },
    buildProjectDeps(org?.subscriptionStatus ?? null),
  );

  if (!result.ok) {
    const fieldErrors: Record<string, string> = {};
    if ("issues" in result && Array.isArray(result.issues)) {
      for (const issue of result.issues as Array<{ path: string[]; message: string }>) {
        if (issue.path.length > 0) fieldErrors[String(issue.path[0])] = issue.message;
      }
    }
    return { error: result.error, fieldErrors };
  }

  const project = result.data as { id: string };
  redirect(`/projects/${project.id}`);
}
