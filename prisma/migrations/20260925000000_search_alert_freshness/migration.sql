ALTER TABLE "Event" ADD COLUMN "lastVerifiedAt" TIMESTAMP(3), ADD COLUMN "lastVerifiedSource" TEXT;
CREATE TABLE "FavoriteAlert" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "changes" BOOLEAN NOT NULL DEFAULT true,
    "deadlines" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'pt',
    "snapshot" JSONB NOT NULL,
    "pending" JSONB,
    "lastSentAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "FavoriteAlert_enabled_checkedAt_idx" ON "FavoriteAlert"("enabled", "checkedAt");
