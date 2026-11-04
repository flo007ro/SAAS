-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DesignRunStatus" AS ENUM ('draft', 'calculating', 'complete', 'failed', 'superseded');

-- CreateEnum
CREATE TYPE "UnitSystem" AS ENUM ('metric', 'imperial');

-- CreateEnum
CREATE TYPE "CodeProfile" AS ENUM ('AISC_360_22', 'CSA_S16_19');

-- CreateEnum
CREATE TYPE "DesignRunType" AS ENUM ('beam', 'column', 'base_plate', 'brace');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'none',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "codeProfile" "CodeProfile" NOT NULL,
    "unitSystem" "UnitSystem" NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "supersedesDesignRunId" TEXT,
    "type" "DesignRunType" NOT NULL,
    "title" TEXT NOT NULL,
    "inputJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "errorCode" TEXT,
    "engineVersion" TEXT,
    "sectionDbVersion" TEXT,
    "status" "DesignRunStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "designRunId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteelSection" (
    "id" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "unitSystem" "UnitSystem" NOT NULL,
    "sectionDbVersion" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "weightOrMass" DOUBLE PRECISION NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,
    "flangeWidth" DOUBLE PRECISION NOT NULL,
    "webThickness" DOUBLE PRECISION NOT NULL,
    "flangeThickness" DOUBLE PRECISION NOT NULL,
    "sx" DOUBLE PRECISION NOT NULL,
    "ix" DOUBLE PRECISION NOT NULL,
    "rx" DOUBLE PRECISION NOT NULL,
    "ry" DOUBLE PRECISION,
    "fy" DOUBLE PRECISION,
    "sy" DOUBLE PRECISION,
    "iy" DOUBLE PRECISION,
    "sourceNote" TEXT NOT NULL,

    CONSTRAINT "SteelSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_stripeCustomerId_idx" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SteelSection_standard_unitSystem_sectionDbVersion_family_idx" ON "SteelSection"("standard", "unitSystem", "sectionDbVersion", "family");

-- CreateIndex
CREATE INDEX "SteelSection_designation_idx" ON "SteelSection"("designation");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignRun" ADD CONSTRAINT "DesignRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignRun" ADD CONSTRAINT "DesignRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_designRunId_fkey" FOREIGN KEY ("designRunId") REFERENCES "DesignRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
