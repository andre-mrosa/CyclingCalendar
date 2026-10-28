CREATE TABLE "FavoriteEditionPreference" (
    "userId" TEXT NOT NULL,
    "follow" BOOLEAN NOT NULL DEFAULT false,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'pt',
    "state" JSONB NOT NULL DEFAULT '{}',
    "pending" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSentAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FavoriteEditionPreference_pkey" PRIMARY KEY ("userId")
);
CREATE INDEX "FavoriteEditionPreference_follow_checkedAt_idx" ON "FavoriteEditionPreference"("follow", "checkedAt");
