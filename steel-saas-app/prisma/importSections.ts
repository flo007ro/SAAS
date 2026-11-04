import { readFileSync, statSync } from "node:fs";
import { parseSectionImportOptions, planSectionImport, provenanceWarning } from "./sectionImport";
import { parseAiscCatalog } from "./aiscCatalog";

async function main() {
  const { apply, aiscCatalog } = parseSectionImportOptions(process.argv.slice(2));
  if (aiscCatalog && statSync(aiscCatalog).size > 5_000_000) throw new Error("Catalog exceeds 5 MB limit");
  const dataset = aiscCatalog ? parseAiscCatalog(JSON.parse(readFileSync(aiscCatalog, "utf8"))) : undefined;
  console.warn(dataset ? "AISC operator-supplied workbook: verify authenticity, material assumption and data-use rights. Database import does not activate the application catalog." : provenanceWarning);
  if (!apply) {
    const plan = planSectionImport([], dataset);
    console.log(JSON.stringify({ mode: "offline-preview", datasetRows: plan.create.length,
      sectionDbVersion: plan.create[0]?.sectionDbVersion,
      designations: plan.create.map(s => s.designation) }));
    return;
  }
  // Dynamic import keeps the default preview entirely database-free.
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(async tx => {
      const plan = planSectionImport(await tx.steelSection.findMany(), dataset);
      if (plan.create.length) await tx.steelSection.createMany({ data: plan.create });
      return { created: plan.create.length, skipped: plan.skipped };
    }, { isolationLevel: "Serializable" });
    console.log(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  // Do not print Prisma errors, which may include connection details.
  console.error("Section import failed. Check arguments, conflicts, database availability and transaction contention. No credentials are logged.");
  process.exitCode = 1;
});
