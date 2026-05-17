import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { handleCreateProject, handleListProjects } from "./handler";
import { buildProjectDeps } from "./prismaProjectDeps";

async function getSessionAndStatus() {
  const session = await auth();
  if (!session?.user?.userId) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = await (prisma as any).organization.findUnique({
    where: { id: session.user.organizationId },
    select: { subscriptionStatus: true },
  });
  return {
    session: { userId: session.user.userId, organizationId: session.user.organizationId },
    subscriptionStatus: (org?.subscriptionStatus ?? null) as string | null,
  };
}

export async function POST(req: Request) {
  const ctx = await getSessionAndStatus();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const result = await handleCreateProject(body, ctx.session, buildProjectDeps(ctx.subscriptionStatus));

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.issues ? { issues: result.issues } : {}) },
      { status: result.httpStatus },
    );
  }
  return NextResponse.json(result.data, { status: 201 });
}

export async function GET() {
  const ctx = await getSessionAndStatus();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await handleListProjects(ctx.session, buildProjectDeps(ctx.subscriptionStatus));

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }
  return NextResponse.json(result.data);
}
