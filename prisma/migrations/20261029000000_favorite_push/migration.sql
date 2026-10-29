CREATE TABLE "FavoritePushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "hour" INTEGER NOT NULL DEFAULT 10,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Lisbon',
    "language" TEXT NOT NULL DEFAULT 'pt',
    "state" JSONB NOT NULL DEFAULT '{}',
    "lastDeliveryDay" TEXT,
    "lastTestAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "FavoritePushSubscription_endpoint_key" ON "FavoritePushSubscription"("endpoint");
CREATE INDEX "FavoritePushSubscription_userId_idx" ON "FavoritePushSubscription"("userId");
CREATE INDEX "FavoritePushSubscription_enabled_id_idx" ON "FavoritePushSubscription"("enabled", "id");
CREATE TABLE "PushScheduleRun" (
    "day" TEXT NOT NULL PRIMARY KEY,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
