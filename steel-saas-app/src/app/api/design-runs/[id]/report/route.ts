import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { enforceSubscription } from "../../../../../lib/subscriptionGuard";
import { designResultSchema } from "../../../../../domain/resultContract";
import { generatePdfReport } from "../../../../../reports/generatePdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = await (prisma as any).organization.findUnique({
    where: { id: session.user.organizationId },
    select: { subscriptionStatus: true },
  });
  const enforcement = enforceSubscription(org?.subscriptionStatus);
  if (!enforcement.allowed) {
    return NextResponse.json({ error: enforcement.message }, { status: enforcement.httpStatus });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = await (prisma as any).designRun.findFirst({
    where: { id, project: { organizationId: session.user.organizationId } },
    include: { project: true },
  });

  if (!run) {
    return NextResponse.json({ error: "Design run not found." }, { status: 404 });
  }
  if (run.status !== "complete") {
    return NextResponse.json(
      { error: `Design run is not complete (status: ${run.status}).` },
      { status: 409 },
    );
  }

  const parsed = designResultSchema.safeParse(run.resultJson);
  if (!parsed.success) {
    return NextResponse.json({ error: "Stored result_json does not match contract." }, { status: 500 });
  }

  const pdfBuffer = await generatePdfReport(parsed.data, {
    projectName: run.project.name,
    client: run.project.client,
    location: run.project.location,
    codeProfile: String(run.project.codeProfile),
    unitSystem: String(run.project.unitSystem),
    reportDate: new Date().toISOString().split("T")[0],
    engineVersion: run.engineVersion ?? parsed.data.engineVersion,
    reportTimestamp: new Date().toISOString(),
  });

  const filename = `${run.title.replace(/[^a-z0-9]/gi, "_")}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
