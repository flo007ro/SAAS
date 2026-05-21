import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unitSystem = searchParams.get("unitSystem");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections = await (prisma as any).steelSection.findMany({
    where: unitSystem ? { unitSystem } : undefined,
    orderBy: { weightOrMass: "asc" },
  });

  return NextResponse.json(sections);
}
