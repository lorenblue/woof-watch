-- CreateTable
CREATE TABLE "ActionType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionType_key_key" ON "ActionType"("key");

-- Seed known action types
INSERT INTO "ActionType" ("id", "key")
VALUES
    (lower(hex(randomblob(12))), 'pee'),
    (lower(hex(randomblob(12))), 'poo'),
    (lower(hex(randomblob(12))), 'eat')
ON CONFLICT("key") DO NOTHING;

-- Seed any action types already present in events
INSERT INTO "ActionType" ("id", "key")
SELECT lower(hex(randomblob(12))), e."actionType"
FROM "DogEvent" e
LEFT JOIN "ActionType" t ON t."key" = e."actionType"
WHERE t."id" IS NULL;

-- RedefineTable
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DogEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dogId" TEXT NOT NULL,
    "actionTypeId" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "undoneAt" DATETIME,
    "undoneById" TEXT,
    CONSTRAINT "DogEvent_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "Dog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DogEvent_actionTypeId_fkey" FOREIGN KEY ("actionTypeId") REFERENCES "ActionType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DogEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DogEvent" ("id", "dogId", "actionTypeId", "occurredAt", "recordedAt", "actorId", "undoneAt", "undoneById")
SELECT
    e."id",
    e."dogId",
    t."id",
    e."occurredAt",
    e."recordedAt",
    e."actorId",
    e."undoneAt",
    e."undoneById"
FROM "DogEvent" e
JOIN "ActionType" t ON t."key" = e."actionType";
DROP TABLE "DogEvent";
ALTER TABLE "new_DogEvent" RENAME TO "DogEvent";
CREATE INDEX "DogEvent_dogId_actionTypeId_occurredAt_idx" ON "DogEvent"("dogId", "actionTypeId", "occurredAt");
CREATE INDEX "DogEvent_actorId_recordedAt_idx" ON "DogEvent"("actorId", "recordedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
