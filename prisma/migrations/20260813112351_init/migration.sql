-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "sortDate" TIMESTAMP(3) NOT NULL,
    "details" TEXT,
    "tag" TEXT,
    "ambito" TEXT,
    "escaloes" TEXT,
    "licenca" TEXT,
    "regiao" TEXT,
    "distrito" TEXT,
    "source" TEXT NOT NULL,
    "link" TEXT,
    "extraLinks" TEXT,
    "organizador" TEXT,
    "registrationOpensAt" TIMESTAMP(3),
    "registrationClosesAt" TIMESTAMP(3),
    "prices" TEXT,
    "description" TEXT,
    "insurance" TEXT,
    "prizes" TEXT,
    "programa" TEXT,
    "logo" TEXT,
    "image" TEXT,
    "gpxData" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTranslation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "description" TEXT,
    "programa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "userId" TEXT,
    "userEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDeletionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DELETE_ACCOUNT',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSession" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT NOT NULL DEFAULT 'Desconhecido',
    "city" TEXT NOT NULL DEFAULT 'Desconhecido',
    "region" TEXT,
    "device" TEXT NOT NULL DEFAULT 'Desktop',
    "browser" TEXT NOT NULL DEFAULT 'Outro',
    "os" TEXT NOT NULL DEFAULT 'Outro',
    "referrer" TEXT,
    "initialPath" TEXT NOT NULL DEFAULT '/',
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "pageViewsCount" INTEGER NOT NULL DEFAULT 1,
    "eventsCount" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "targetId" TEXT,
    "targetTitle" TEXT,
    "metadata" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Municipality" (
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "LocationCache" (
    "query" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationCache_pkey" PRIMARY KEY ("query")
);

-- CreateIndex
CREATE INDEX "Event_sortDate_idx" ON "Event"("sortDate");

-- CreateIndex
CREATE INDEX "Event_source_idx" ON "Event"("source");

-- CreateIndex
CREATE INDEX "Event_regiao_idx" ON "Event"("regiao");

-- CreateIndex
CREATE INDEX "Event_distrito_idx" ON "Event"("distrito");

-- CreateIndex
CREATE INDEX "Event_ambito_idx" ON "Event"("ambito");

-- CreateIndex
CREATE INDEX "Event_tag_idx" ON "Event"("tag");

-- CreateIndex
CREATE INDEX "EventTranslation_language_idx" ON "EventTranslation"("language");

-- CreateIndex
CREATE INDEX "EventTranslation_eventId_idx" ON "EventTranslation"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTranslation_eventId_language_key" ON "EventTranslation"("eventId", "language");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX "SystemLog_source_idx" ON "SystemLog"("source");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountDeletionRequest_userId_key" ON "AccountDeletionRequest"("userId");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_status_idx" ON "AccountDeletionRequest"("status");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_type_idx" ON "AccountDeletionRequest"("type");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_createdAt_idx" ON "AccountDeletionRequest"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsSession_createdAt_idx" ON "AnalyticsSession"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsSession_visitorId_idx" ON "AnalyticsSession"("visitorId");

-- CreateIndex
CREATE INDEX "AnalyticsSession_isAdmin_idx" ON "AnalyticsSession"("isAdmin");

-- CreateIndex
CREATE INDEX "AnalyticsSession_country_idx" ON "AnalyticsSession"("country");

-- CreateIndex
CREATE INDEX "AnalyticsSession_city_idx" ON "AnalyticsSession"("city");

-- CreateIndex
CREATE INDEX "AnalyticsSession_device_idx" ON "AnalyticsSession"("device");

-- CreateIndex
CREATE INDEX "AnalyticsSession_lastActiveAt_idx" ON "AnalyticsSession"("lastActiveAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_visitorId_idx" ON "AnalyticsEvent"("visitorId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_idx" ON "AnalyticsEvent"("type");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_targetId_idx" ON "AnalyticsEvent"("targetId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_isAdmin_idx" ON "AnalyticsEvent"("isAdmin");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_path_idx" ON "AnalyticsEvent"("path");

-- AddForeignKey
ALTER TABLE "EventTranslation" ADD CONSTRAINT "EventTranslation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AnalyticsSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
