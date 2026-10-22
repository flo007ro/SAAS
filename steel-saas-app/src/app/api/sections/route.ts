import { auth } from "@/lib/auth";
import { sectionSeedV1 } from "@/domain/sections/sectionSeed.v1";
import { codeProfileSchema, unitSystemSchema } from "@/domain/resultContract";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const units = unitSystemSchema.safeParse(req.nextUrl.searchParams.get("unitSystem"));
  const standard = req.nextUrl.searchParams.get("standard");
  if (!units.success || (standard !== null && !codeProfileSchema.safeParse(standard).success)) {
    return NextResponse.json({ error: "Valid unitSystem and optional standard are required." }, { status: 400 });
  }
  // Offer only the versioned reference data actually consumed by the engines.
  // Preserve persisted section records; they are not an engine input source today.
  return NextResponse.json(sectionSeedV1
    .filter(s => s.unitSystem === units.data && (!standard || s.standard === standard))
    .map(({ designation, standard, unitSystem }) => ({ designation, standard, unitSystem })));
}
