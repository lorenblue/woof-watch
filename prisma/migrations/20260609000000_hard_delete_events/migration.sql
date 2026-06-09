-- Existing undone rows represented events the user removed from the timeline.
-- Hard-delete them before dropping the soft-delete columns.
DELETE FROM "dog_event"
WHERE "undoneAt" IS NOT NULL;

DROP INDEX "dog_event_dogId_actionTypeId_undoneAt_occurredAt_idx";

ALTER TABLE "dog_event" DROP CONSTRAINT "dog_event_undoneById_fkey";

ALTER TABLE "dog_event"
	DROP COLUMN "undoneAt",
	DROP COLUMN "undoneById";

CREATE INDEX "dog_event_dogId_actionTypeId_occurredAt_idx"
ON "dog_event"("dogId", "actionTypeId", "occurredAt" DESC);
