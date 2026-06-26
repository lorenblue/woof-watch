CREATE TABLE "reminder_delivery" (
	"id" TEXT NOT NULL,
	"dogId" TEXT NOT NULL,
	"actionTypeId" TEXT NOT NULL,
	"ruleKey" TEXT NOT NULL,
	"localDate" TEXT NOT NULL,
	"sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "reminder_delivery_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "reminder_delivery"
	ADD CONSTRAINT "reminder_delivery_dogId_fkey"
	FOREIGN KEY ("dogId") REFERENCES "dog"("id")
	ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reminder_delivery"
	ADD CONSTRAINT "reminder_delivery_actionTypeId_fkey"
	FOREIGN KEY ("actionTypeId") REFERENCES "action_type"("key")
	ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "reminder_delivery_dogId_actionTypeId_ruleKey_localDate_key"
ON "reminder_delivery"("dogId", "actionTypeId", "ruleKey", "localDate");

CREATE INDEX "reminder_delivery_sentAt_idx"
ON "reminder_delivery"("sentAt");
