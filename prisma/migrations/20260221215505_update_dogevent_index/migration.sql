-- DropIndex
DROP INDEX "DogEvent_actorId_recordedAt_idx";

-- DropIndex
DROP INDEX "DogEvent_dogId_actionTypeId_occurredAt_idx";

-- CreateIndex
CREATE INDEX "DogEvent_dogId_actionTypeId_undoneAt_occurredAt_idx" ON "DogEvent"("dogId", "actionTypeId", "undoneAt", "occurredAt" DESC);
