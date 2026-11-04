# Live Database Setup

## Evidence And Limits

The operator reports manually applying the production Neon schema (seven application
tables) and manually registering `0_init` in `_prisma_migrations`. No production
connection, credentials, deployment or push was used for this review.

The local migration's exact SHA-256 is:
`8e22daa1d639d44d9ff416bdbfdadfa95a0799b9f27a29f6b902342c623452b9`.
It matches the reported registration. Do not edit this migration, including line
endings. Seven tables alone do not establish schema equivalence: enums, defaults,
nullability, indexes, referential actions and constraint names also matter.

## Read-Only Production Audit

An authorized operator can run these in the Neon SQL editor. These queries do not
change data. Production correctness remains pending until their results are reviewed.

```sql
SELECT id, migration_name, checksum, started_at, finished_at,
       rolled_back_at, applied_steps_count, logs
FROM public._prisma_migrations
ORDER BY started_at;

SELECT c.conrelid::regclass AS child_table, c.conname,
       pg_get_constraintdef(c.oid) AS definition, c.convalidated
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public' AND c.contype = 'f'
ORDER BY child_table::text, c.conname;
```

Expected FK names (all target `id`, `ON DELETE RESTRICT ON UPDATE CASCADE`):

| Child | Column | Parent | Constraint |
| --- | --- | --- | --- |
| User | organizationId | Organization | User_organizationId_fkey |
| Subscription | organizationId | Organization | Subscription_organizationId_fkey |
| Project | organizationId | Organization | Project_organizationId_fkey |
| DesignRun | projectId | Project | DesignRun_projectId_fkey |
| DesignRun | createdByUserId | User | DesignRun_createdByUserId_fkey |
| Report | designRunId | DesignRun | Report_designRunId_fkey |

These follow [Prisma's default naming convention](https://docs.prisma.io/docs/orm/v6/prisma-schema/data-model/database-mapping).
PostgreSQL-generated names often match, but UI-generated names are not proof.
All six must be validated; `NO ACTION` is not identical to `RESTRICT`.
If names differ, review an explicit constraint rename or Prisma `map:` change;
do not recreate tables or edit the registered baseline to hide drift.

For the registration, expect exactly one active `0_init` row with the checksum
above, a nonempty unique id, valid `started_at`, non-null `finished_at`, null
`rolled_back_at`, and no failure logs. A baseline recorded by resolve may have
`applied_steps_count = 0`; that is not evidence of failure. Inspect the migration
table structure too if it was manually created; matching row values alone cannot
prove Prisma compatibility.

The supported [Prisma 6 baseline workflow](https://www.prisma.io/docs/orm/v6/prisma-migrate/getting-started)
uses `prisma migrate resolve --applied 0_init`. Do not rerun resolve when a valid
applied row already exists, and do not replay the initial SQL over existing tables.
An authorized later check should include `prisma migrate status` plus a read-only
schema diff against `prisma/schema.prisma`; status checks history, not schema drift.
Do not use `migrate dev`, `migrate reset`, or `db push` on production.

## Section-Only Import

Offline preview (does not load Prisma or connect to a database):

```powershell
npm run db:import-sections
```

Only after independently confirming the intended database target, with its normal
runtime environment supplied securely by an authorized operator:

```powershell
npm run db:import-sections -- --apply --acknowledge-provenance-limitations
```

This command writes only `SteelSection`. It never creates accounts, organizations,
projects, subscriptions, or subscription bypasses. It uses only the existing
repository `sectionSeedV1` dataset. Its source comments are not independent source
verification: some properties are geometry-derived, and authoritative CISC/AISC
table verification is still required before engineering or paid use. New rows carry
this warning in `sourceNote`; the command also prints it on every invocation.
This is a safe-scoped database operation, not certification of the engineering data.

Identity is standard + unit system + dataset version + designation. Matching rows
are skipped without overwriting their original source notes. Duplicate identities
or conflicting properties abort before inserts. All writes share one serializable
transaction; concurrent runs can fail safely and should be rerun after inspecting
the result. The schema has no unique natural-key constraint, so unrelated writers
must not import the same identities concurrently using weaker isolation.

Do not use `db:seed` for production: it is a separate development-only command
which creates a known demo account and marks a demo subscription active.

## Local Verification

```powershell
npm test
npm run typecheck
```

If the global npm shim is broken, the installed tools can be invoked directly:

```powershell
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
node --import tsx prisma/importSections.ts
```

Tests cover seed production guards, checksum immutability, preview opt-in,
versioned identity, repeatability and conflict/duplicate refusal. They do not prove
live PostgreSQL transaction behavior or production drift absence. No live import
is part of these checks.
