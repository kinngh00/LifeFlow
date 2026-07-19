-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProgramCategory" AS ENUM ('YOUTH_EMPLOYMENT', 'YOUTH_HOUSING');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('OFFICIAL_PAGE', 'PUBLIC_NOTICE', 'ATTACHMENT');

-- CreateEnum
CREATE TYPE "RegionCoverageType" AS ENUM ('CITY_WIDE', 'DISTRICT');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('AGE', 'REGION', 'EMPLOYMENT', 'STUDENT', 'INCOME_BAND', 'HOUSING', 'APPLICATION_PERIOD', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "RuleOutcome" AS ENUM ('PASS', 'FAIL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('ELIGIBLE', 'NEEDS_REVIEW', 'NOT_ELIGIBLE', 'UNDETERMINED');

-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('FIXED_PERIOD', 'ALWAYS_OPEN', 'BUDGET_EXHAUSTION');

-- CreateEnum
CREATE TYPE "AmountType" AS ENUM ('FIXED', 'RANGE', 'MAXIMUM', 'FORMULA', 'IN_KIND', 'UNDETERMINED');

-- CreateEnum
CREATE TYPE "PublicationEventType" AS ENUM ('PUBLISHED', 'UNPUBLISHED', 'VERSION_REPLACED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'TEST_RUN', 'PUBLISH', 'UNPUBLISH', 'ARCHIVE');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportProgram" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "ProgramCategory" NOT NULL,
    "managingOrganization" TEXT NOT NULL,
    "operatingOrganization" TEXT,
    "currentPublishedVersionId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "SupportProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramVersion" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullDescription" TEXT NOT NULL,
    "targetSummary" TEXT NOT NULL,
    "benefitType" TEXT NOT NULL,
    "amountType" "AmountType" NOT NULL,
    "minimumAmount" DECIMAL(15,2),
    "maximumAmount" DECIMAL(15,2),
    "amountUnit" TEXT,
    "amountDescription" TEXT,
    "applicationType" "ApplicationType" NOT NULL,
    "applicationStartDate" DATE,
    "applicationEndDate" DATE,
    "applicationMethod" TEXT NOT NULL,
    "applicationUrl" TEXT,
    "contactInformation" TEXT NOT NULL,
    "requiredDocuments" JSONB NOT NULL DEFAULT '[]',
    "cautionText" TEXT,
    "checkedAt" DATE NOT NULL,
    "reviewedAt" DATE,
    "reviewDueAt" DATE,
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "supersedesVersionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramSource" (
    "id" TEXT NOT NULL,
    "programVersionId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "organizationName" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "documentIdentifier" TEXT,
    "publishedAt" DATE,
    "checkedAt" DATE NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramRegion" (
    "id" TEXT NOT NULL,
    "programVersionId" TEXT NOT NULL,
    "cityCode" TEXT NOT NULL,
    "districtCode" TEXT NOT NULL DEFAULT 'ALL',
    "coverageType" "RegionCoverageType" NOT NULL,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "requirementNote" TEXT,

    CONSTRAINT "ProgramRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityRule" (
    "id" TEXT NOT NULL,
    "programVersionId" TEXT NOT NULL,
    "ruleType" "RuleType" NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedCondition" JSONB NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "missingValueBehavior" "RuleOutcome" NOT NULL DEFAULT 'UNKNOWN',
    "passMessage" TEXT NOT NULL,
    "failureMessage" TEXT NOT NULL,
    "unknownMessage" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceLocation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EligibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleTestCase" (
    "id" TEXT NOT NULL,
    "programVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputSnapshot" JSONB NOT NULL,
    "expectedOverallStatus" "EligibilityStatus" NOT NULL,
    "expectedRuleOutcomes" JSONB NOT NULL DEFAULT '{}',
    "requiredForPublish" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleTestRun" (
    "id" TEXT NOT NULL,
    "programVersionId" TEXT NOT NULL,
    "executedById" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configurationHash" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "passedCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "overallPassed" BOOLEAN NOT NULL,

    CONSTRAINT "RuleTestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleTestResult" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "expectedStatus" "EligibilityStatus" NOT NULL,
    "actualStatus" "EligibilityStatus" NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "failureDetail" TEXT,
    "evaluatedRuleResults" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "RuleTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationEvent" (
    "id" TEXT NOT NULL,
    "programVersionId" TEXT NOT NULL,
    "eventType" "PublicationEventType" NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "previousPublishedVersionId" TEXT,
    "configurationHash" TEXT NOT NULL,

    CONSTRAINT "PublicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changeSummary" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestMetadata" JSONB,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_active_idx" ON "AdminUser"("active");

-- CreateIndex
CREATE UNIQUE INDEX "SupportProgram_slug_key" ON "SupportProgram"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SupportProgram_currentPublishedVersionId_key" ON "SupportProgram"("currentPublishedVersionId");

-- CreateIndex
CREATE INDEX "SupportProgram_category_archivedAt_idx" ON "SupportProgram"("category", "archivedAt");

-- CreateIndex
CREATE INDEX "SupportProgram_createdById_idx" ON "SupportProgram"("createdById");

-- CreateIndex
CREATE INDEX "ProgramVersion_publicationStatus_publishedAt_idx" ON "ProgramVersion"("publicationStatus", "publishedAt");

-- CreateIndex
CREATE INDEX "ProgramVersion_applicationStartDate_applicationEndDate_idx" ON "ProgramVersion"("applicationStartDate", "applicationEndDate");

-- CreateIndex
CREATE INDEX "ProgramVersion_createdById_idx" ON "ProgramVersion"("createdById");

-- CreateIndex
CREATE INDEX "ProgramVersion_supersedesVersionId_idx" ON "ProgramVersion"("supersedesVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramVersion_programId_versionNumber_key" ON "ProgramVersion"("programId", "versionNumber");

-- CreateIndex
CREATE INDEX "ProgramSource_programVersionId_idx" ON "ProgramSource"("programVersionId");

-- CreateIndex
CREATE INDEX "ProgramSource_sourceType_idx" ON "ProgramSource"("sourceType");

-- A version may have many sources, but only one source may be marked primary.
CREATE UNIQUE INDEX "ProgramSource_one_primary_per_version_idx"
ON "ProgramSource"("programVersionId")
WHERE "isPrimary" = true;

-- CreateIndex
CREATE INDEX "ProgramRegion_cityCode_districtCode_idx" ON "ProgramRegion"("cityCode", "districtCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramRegion_programVersionId_cityCode_districtCode_key" ON "ProgramRegion"("programVersionId", "cityCode", "districtCode");

-- CreateIndex
CREATE INDEX "EligibilityRule_programVersionId_ruleType_active_idx" ON "EligibilityRule"("programVersionId", "ruleType", "active");

-- CreateIndex
CREATE INDEX "EligibilityRule_sourceId_idx" ON "EligibilityRule"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "EligibilityRule_programVersionId_displayOrder_key" ON "EligibilityRule"("programVersionId", "displayOrder");

-- CreateIndex
CREATE INDEX "RuleTestCase_createdById_idx" ON "RuleTestCase"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "RuleTestCase_programVersionId_name_key" ON "RuleTestCase"("programVersionId", "name");

-- CreateIndex
CREATE INDEX "RuleTestRun_programVersionId_executedAt_idx" ON "RuleTestRun"("programVersionId", "executedAt");

-- CreateIndex
CREATE INDEX "RuleTestRun_executedById_idx" ON "RuleTestRun"("executedById");

-- CreateIndex
CREATE INDEX "RuleTestResult_testCaseId_idx" ON "RuleTestResult"("testCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleTestResult_testRunId_testCaseId_key" ON "RuleTestResult"("testRunId", "testCaseId");

-- CreateIndex
CREATE INDEX "PublicationEvent_programVersionId_performedAt_idx" ON "PublicationEvent"("programVersionId", "performedAt");

-- CreateIndex
CREATE INDEX "PublicationEvent_previousPublishedVersionId_idx" ON "PublicationEvent"("previousPublishedVersionId");

-- CreateIndex
CREATE INDEX "PublicationEvent_performedById_idx" ON "PublicationEvent"("performedById");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_occurredAt_idx" ON "AdminAuditLog"("adminUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "SupportProgram" ADD CONSTRAINT "SupportProgram_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportProgram" ADD CONSTRAINT "SupportProgram_currentPublishedVersionId_fkey" FOREIGN KEY ("currentPublishedVersionId") REFERENCES "ProgramVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramVersion" ADD CONSTRAINT "ProgramVersion_programId_fkey" FOREIGN KEY ("programId") REFERENCES "SupportProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramVersion" ADD CONSTRAINT "ProgramVersion_supersedesVersionId_fkey" FOREIGN KEY ("supersedesVersionId") REFERENCES "ProgramVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramVersion" ADD CONSTRAINT "ProgramVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramSource" ADD CONSTRAINT "ProgramSource_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramRegion" ADD CONSTRAINT "ProgramRegion_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityRule" ADD CONSTRAINT "EligibilityRule_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityRule" ADD CONSTRAINT "EligibilityRule_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProgramSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleTestCase" ADD CONSTRAINT "RuleTestCase_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleTestCase" ADD CONSTRAINT "RuleTestCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleTestRun" ADD CONSTRAINT "RuleTestRun_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleTestRun" ADD CONSTRAINT "RuleTestRun_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleTestResult" ADD CONSTRAINT "RuleTestResult_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "RuleTestRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleTestResult" ADD CONSTRAINT "RuleTestResult_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "RuleTestCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "ProgramVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_previousPublishedVersionId_fkey" FOREIGN KEY ("previousPublishedVersionId") REFERENCES "ProgramVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
