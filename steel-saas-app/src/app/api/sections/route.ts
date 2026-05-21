import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unitSystem = req.nextUrl.searchParams.get("unitSystem");
  if (!unitSystem) return NextResponse.json({ error: "unitSystem required" }, { status: 400 });

  const sections = await prisma.steelSection.findMany({
    where: { unitSystem },
    orderBy: { designation: "asc" },
    select: { designation: true, standard: true, unitSystem: true },
  });

  return NextResponse.json(sections);
}
