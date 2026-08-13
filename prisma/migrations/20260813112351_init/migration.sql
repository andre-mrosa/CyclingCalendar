-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "sortDate" DATETIME NOT NULL,
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
    "registrationOpensAt" DATETIME,
    "registrationClosesAt" DATETIME,
    "prices" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
