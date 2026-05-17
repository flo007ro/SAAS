import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { handleGetProject, handlePatchProject, handleDeleteProject } from "../handler";
import { buildProjectDeps } from "../prismaProjectDeps";

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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const ctx = await getSessionAndStatus();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await handleGetProject(id, ctx.session, buildProjectDeps(ctx.subscriptionStatus));

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  return NextResponse.json(result.data);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const ctx = await getSessionAndStatus();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const result = await handlePatchProject(id, body, ctx.session, buildProjectDeps(ctx.subscriptionStatus));

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.issues ? { issues: result.issues } : {}) },
      { status: result.httpStatus },
    );
  }
  return NextResponse.json(result.data);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const ctx = await getSessionAndStatus();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await handleDeleteProject(id, ctx.session, buildProjectDeps(ctx.subscriptionStatus));

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  return NextResponse.json(result.data);
}
