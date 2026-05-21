/**
 * Dev seed — safe to run multiple times (idempotent).
 *
 * Creates in order:
 *   1. Organization  "Beta Firm"              subscriptionStatus: active
 *   2. User          engineer@betafirm.com    role: admin, password: betapassword1
 *   3. Project       "Test Project"           CSA S16-19 · metric
 *
 * Run: npx prisma db seed
 * (or: npm run db:seed  after adding that script to package.json)
 *
 * Does NOT create design runs or reports — those are generated through
 * the application flow after login.
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/passwordHash";
import { sectionSeedV1 } from "../src/domain/sections/sectionSeed.v1";

const prisma = new PrismaClient();

async function main() {
  // ── 1. Organization ────────────────────────────────────────────────────────
  let org = await prisma.organization.findFirst({
    where: { name: "Beta Firm" },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Beta Firm",
        plan: "beta",
        status: "active",
        subscriptionStatus: "active",
      },
    });
    console.log(`✔ Created organisation: ${org.id}  "${org.name}"`);
  } else {
    // Ensure subscription is active on re-run
    org = await prisma.organization.update({
      where: { id: org.id },
      data: { subscriptionStatus: "active" },
    });
    console.log(`· Organisation already exists: ${org.id}  "${org.name}" (subscription ensured active)`);
  }

  // ── 2. User ────────────────────────────────────────────────────────────────
  const email = "engineer@betafirm.com";
  const passwordHash = await hashPassword("betapassword1");

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },          // refresh hash on re-run
    create: {
      organizationId: org.id,
      email,
      passwordHash,
      role: "admin",
      status: "active",
    },
  });

  const userVerb = user.createdAt.getTime() === user.updatedAt.getTime() ? "✔ Created" : "· Updated";
  console.log(`${userVerb} user: ${user.id}  <${user.email}>`);

  // ── 3. Project ─────────────────────────────────────────────────────────────
  let project = await prisma.project.findFirst({
    where: { organizationId: org.id, name: "Test Project" },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: "Test Project",
        client: "Beta Firm",
        location: "Toronto, ON",
        codeProfile: "CSA_S16_19",
        unitSystem: "metric",
      },
    });
    console.log(`✔ Created project: ${project.id}  "${project.name}"`);
  } else {
    console.log(`· Project already exists: ${project.id}  "${project.name}"`);
  }

  // ── 4. Steel sections ──────────────────────────────────────────────────────
  let created = 0;
  for (const s of sectionSeedV1) {
    const existing = await (prisma as any).steelSection.findFirst({
      where: { designation: s.designation },
    });
    if (!existing) {
      await (prisma as any).steelSection.create({ data: s });
      created++;
    }
  }
  if (created > 0) {
    console.log(`✔ Seeded ${created} steel section(s)`);
  } else {
    console.log(`· Steel sections already seeded (${sectionSeedV1.length} total)`);
  }

  console.log("\nSeed complete. Login with:");
  console.log(`  email:    ${email}`);
  console.log(`  password: betapassword1`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
