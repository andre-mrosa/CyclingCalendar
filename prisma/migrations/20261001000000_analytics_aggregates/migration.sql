CREATE TABLE "AnalyticsAggregate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "targetId" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalyticsAggregate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnalyticsAggregate_key_key" ON "AnalyticsAggregate"("key");
CREATE INDEX "AnalyticsAggregate_day_type_idx" ON "AnalyticsAggregate"("day", "type");
CREATE INDEX "AnalyticsAggregate_type_targetId_idx" ON "AnalyticsAggregate"("type", "targetId");
