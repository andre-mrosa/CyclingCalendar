CREATE TABLE "SavedSearch" (
  "userId" TEXT NOT NULL, "id" TEXT NOT NULL, "name" TEXT NOT NULL,
  "path" TEXT NOT NULL, "filters" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("userId", "id")
);
CREATE TABLE "EventParticipation" (
  "userId" TEXT NOT NULL, "eventId" TEXT NOT NULL, "status" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventParticipation_pkey" PRIMARY KEY ("userId", "eventId")
);
CREATE TABLE "FavoriteChangePreference" (
  "userId" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT false,
  "language" TEXT NOT NULL DEFAULT 'pt', "revision" INTEGER NOT NULL DEFAULT 1,
  "state" JSONB NOT NULL DEFAULT '{}', "pending" JSONB,
  "lastSentAt" TIMESTAMP(3), "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FavoriteChangePreference_pkey" PRIMARY KEY ("userId")
);
CREATE INDEX "FavoriteChangePreference_enabled_checkedAt_idx" ON "FavoriteChangePreference"("enabled", "checkedAt");
CREATE TABLE "FavoriteChangeRun" (
  "day" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FavoriteChangeRun_pkey" PRIMARY KEY ("day")
);
