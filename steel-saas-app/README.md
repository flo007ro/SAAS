# Steel SaaS App

Next.js app with Prisma 6 and PostgreSQL. Run commands from this directory
(`SAAS/steel-saas-app` if the repository root is `can-you-take-control-of-my`).

## Local setup

1. Install Node.js 22 LTS and run `npm ci` (include dev dependencies for Prisma CLI).
2. Create a dedicated PostgreSQL database named `steel_saas` using your PostgreSQL
   provider or local installation. Do not reuse a production database.
3. Copy `.env.example` to `.env` and edit it privately. Prisma CLI loads `.env`,
   not Next.js's `.env.local`. Shell environment variables override `.env`.
4. Set both database URLs. For local PostgreSQL they can be identical. Generate
   `AUTH_SECRET`, for example with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`.
5. Run `npm run db:validate`, then `npm run db:setup` on the empty database.
6. Optionally set `ALLOW_DEMO_SEED=true` in your local `.env` and run
   `npm run db:seed`. Return the flag to `false` afterward.
7. Run `npm run dev` and open http://localhost:3000.

`db:setup` applies committed migrations and generates the client; it does not seed,
reset, or drop data. The development seed creates the existing Beta Firm account,
Test Project, active demo subscription and existing versioned reference sections.
It resets the demo user's password on rerun. It is not a production bootstrap.
It rejects production environments, but cannot infer whether a URL secretly points
to production: always verify the target privately. Do not run seeds concurrently.
No new section properties are supplied by this database setup.

## Free testing mode

Set `BILLING_MODE=free_beta` in the server environment for free testing, then
restart the local app to load the setting. Keep this server-only; do not use a
`NEXT_PUBLIC_` prefix. Only the exact `free_beta` value enables this mode.
Unset, `paid`, or unknown values retain the existing paid subscription rules.

Free beta allows authenticated users with an existing organization (a non-null
subscription status, including `none`) to use the subscription-gated workflows.
Missing organizations remain denied, and login and tenant isolation still apply.
Projects and signup show "Free testing access"; projects hide Subscribe and Manage
subscription. Checkout and portal POSTs return 403 before any Stripe calls.
Stripe credentials are not needed for these disabled endpoints during free testing.

This setting does not create Stripe customers, mark subscriptions active, modify
stored billing state, or cancel existing Stripe subscriptions or recurring charges.
Existing subscribers must be managed separately before using free testing mode.
Webhooks continue to record real billing events. To enable paid access later,
configure Stripe keys, recurring price, webhook, and canonical app URL, then set
`BILLING_MODE=paid` (or remove it) and restart. Organizations with status `none`
will require a paid subscription again; free testing does not grant permanent access.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run db:validate` | Validate Prisma schema and environment configuration |
| `npm run db:generate` | Generate Prisma Client without migrating |
| `npm run db:setup` | Apply committed migrations, then generate client |
| `npm run db:deploy` | Apply committed migrations only, no seed |
| `npm run db:status` | Inspect migration history (not a schema drift check) |
| `npm run db:migrate -- --name descriptive_name` | Create/apply a migration on a development database only |
| `npm run db:seed` | Explicit, guarded demo seed |

`migrate dev` needs permission to create a shadow database; if your provider does
not allow that, use a separate development PostgreSQL instance. Review generated
SQL and commit the migration directory with schema changes. Never use `migrate
reset`, `db push --accept-data-loss`, or development migration commands in production.

## Vercel production configuration

Provision persistent PostgreSQL separately; Vercel's filesystem is not a database.
Place it near the app's function region and enable backups/recovery. This repository
does not provision a provider, access secrets, or deploy anything.

Set these in Vercel Project Settings > Environment Variables for **Production**:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Provider's pooled PostgreSQL connection string for serverless runtime |
| `DIRECT_URL` | Direct/session PostgreSQL URL to the **same database and schema**, used by Prisma CLI |
| `AUTH_SECRET` | Unique random secret, at least 32 bytes |
| `AUTH_URL` | Canonical HTTPS origin, e.g. `https://your-app.example.com` |
| `NEXT_PUBLIC_APP_URL` | Same HTTPS origin, used for Stripe return URLs |
| `BILLING_MODE` | `paid` by default; explicit `free_beta` enables free testing and disables billing endpoints |
| `STRIPE_SECRET_KEY` | Live Stripe secret key when billing is enabled |
| `STRIPE_PRICE_ID` | Live recurring price ID for checkout |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the live webhook endpoint |

Keep `ALLOW_DEMO_SEED` unset or `false`. Do not prefix database URLs or secrets
with `NEXT_PUBLIC_`. Retain provider-required TLS parameters (usually
`sslmode=require`); URL-encode special characters in credentials. Use the provider's
Prisma 6 pooling settings, not arbitrary pool parameters. Both URLs must also be
available privately to the migration operator. Prisma's direct URL separates
migration connections from pooled application traffic; see
[Prisma connection guidance](https://www.prisma.io/docs/postgres/database/connection-pooling).

Use the Next.js preset, install command `npm ci`, and build command `npm run build`.
Set the Vercel root directory to this app's location relative to the Git root
(`steel-saas-app` when the Git root is `SAAS`). The build generates Prisma Client;
it deliberately does **not** migrate or seed. Run migrations once in an authorized
release job/operator session before releasing code that requires them. If using a
separate CI migration job, install dev dependencies there for the pinned Prisma CLI.

For a **new, empty** production database:

```sh
npm ci
npm run db:validate
npm run db:deploy
npm run db:status
```

Supply real environment values through your secret manager, not command arguments
or committed files. These commands were not run against production during setup.
After a successful migration, redeploy the app so it receives its environment
variables. Use `/signup` for a real account; signup leaves subscription status
`none`. Paid calculation access requires the existing Stripe flow, not demo data.
Configure Stripe webhook delivery to `/api/webhooks/stripe` on the canonical origin.
Database creation alone does not activate subscriptions.

Give Preview and Development separate databases, secrets and Stripe test resources.
Never let preview builds migrate or seed Production. `DIRECT_URL` grants migration
capabilities and should be limited to trusted operators/release environments where
possible; this Prisma 6 schema expects the variable during CLI validation/generation.

## Existing databases: controlled adoption only

The initial `0_init` migration represents the entire current schema, including
`DesignRunType.brace`. It is for empty databases; it must not be replayed on a
database with tables. Existing data and migration history must be inspected by an
authorized operator first. Do not delete `_prisma_migrations` or automatically
mark a baseline applied just to bypass an error.

1. Take a backup and verify restoration into an isolated database. Audit any
   existing migration history. If it differs from this repository, reconcile it
   explicitly before proceeding; the following applies only to databases without
   an existing migration history.
2. Compare the existing schema to this Prisma schema using Prisma 6:

   ```sh
   npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
   ```

   This reads the configured database, does not apply SQL, and returns 2 for
   differences, 1 for an error, 0 for no difference. Do not proceed on 1 or 2.
   Review unsupported/custom database objects separately: Prisma diff is not a
   complete audit of triggers, policies, views, permissions or extensions.
3. If the only verified missing item is the brace enum value, the existing
   `npm run db:enable-brace` remains available for an explicitly authorized additive
   update. Compare again afterward. Other differences require reviewed SQL and
   isolated rehearsal; never silently push/reset or discard data.
4. Only after verifying equivalence, record the baseline without executing its SQL:

   ```sh
   npx prisma migrate resolve --applied 0_init
   npm run db:deploy
   npm run db:status
   ```

   `resolve` writes migration metadata. It is not a schema repair. This adoption
   procedure follows [Prisma 6 baselining guidance](https://docs.prisma.io/docs/orm/v6/prisma-migrate/getting-started).
5. Verify authorized login, project creation/listing, and saved runs in staging
   before production release. Preserve existing record counts and snapshots.

The earlier brace document describes the pre-migration-history state. Its standalone
SQL remains a legacy upgrade tool, not the fresh database setup procedure.

## Verification

Run `npm test` and `npm run typecheck`. Schema validation/client generation do not
prove database connectivity. A real migration rehearsal requires an isolated
PostgreSQL instance: run `db:deploy` twice (second run must report no pending
migrations), `db:status`, and the schema diff above. Never use production for tests.
