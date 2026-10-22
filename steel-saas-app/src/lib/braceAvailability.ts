import { prisma } from "./prisma";

// Safe during rolling deployments: generated clients can know the new enum
// before an existing production database has received the additive SQL update.
export async function braceStorageAvailable() {
  const rows = await prisma.$queryRaw<Array<{ enabled: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'DesignRunType' AND e.enumlabel = 'brace'
        AND n.nspname = current_schema()
    ) AS enabled
  `;
  return rows[0]?.enabled === true;
}
