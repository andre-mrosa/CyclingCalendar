ALTER TABLE "Event" ADD COLUMN "categoryEvidence" JSONB;

CREATE TABLE "SourceQualitySnapshot" (
 "id" TEXT NOT NULL, "scopeKey" TEXT NOT NULL, "source" TEXT NOT NULL, "runId" TEXT,
 "metrics" JSONB NOT NULL, "issues" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SourceQualitySnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SourceQualitySnapshot_scopeKey_createdAt_idx" ON "SourceQualitySnapshot"("scopeKey", "createdAt");
CREATE INDEX "SourceQualitySnapshot_createdAt_idx" ON "SourceQualitySnapshot"("createdAt");

CREATE TABLE "OrganizerSubmission" (
 "id" TEXT NOT NULL, "userId" TEXT, "userEmail" TEXT, "organizerName" TEXT, "eventId" TEXT,
 "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "reviewNote" TEXT, "reviewedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "OrganizerSubmission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrganizerSubmission_userId_createdAt_idx" ON "OrganizerSubmission"("userId", "createdAt");
CREATE INDEX "OrganizerSubmission_status_createdAt_idx" ON "OrganizerSubmission"("status", "createdAt");

CREATE TABLE "SearchAlert" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "path" TEXT NOT NULL DEFAULT '/',
 "filters" JSONB NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT false, "language" TEXT NOT NULL DEFAULT 'pt',
 "revision" INTEGER NOT NULL DEFAULT 1, "state" JSONB NOT NULL DEFAULT '{}', "pending" JSONB,
 "lastSentAt" TIMESTAMP(3), "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "leaseUntil" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SearchAlert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SearchAlert_userId_idx" ON "SearchAlert"("userId");
CREATE INDEX "SearchAlert_enabled_checkedAt_idx" ON "SearchAlert"("enabled", "checkedAt");

CREATE TABLE "SearchAlertRun" (
 "day" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SearchAlertRun_pkey" PRIMARY KEY ("day")
);
