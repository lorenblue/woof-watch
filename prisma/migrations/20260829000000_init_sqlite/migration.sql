CREATE TABLE "actor" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"name" TEXT NOT NULL,
	"code" TEXT,
	"codeUsedAt" DATETIME,
	"createdAt" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'))
);

CREATE TABLE "dog" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"name" TEXT NOT NULL
);

CREATE TABLE "action_type" (
	"key" TEXT NOT NULL PRIMARY KEY
);

CREATE TABLE "dog_event" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"dogId" TEXT NOT NULL,
	"actionTypeId" TEXT NOT NULL,
	"occurredAt" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
	"actorId" TEXT NOT NULL,
	CONSTRAINT "dog_event_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "dog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "dog_event_actionTypeId_fkey" FOREIGN KEY ("actionTypeId") REFERENCES "action_type" ("key") ON DELETE RESTRICT ON UPDATE CASCADE,
	CONSTRAINT "dog_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "session" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"actorId" TEXT NOT NULL,
	"createdAt" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
	"expiresAt" DATETIME NOT NULL,
	"userAgent" TEXT,
	"ipAddress" TEXT,
	CONSTRAINT "session_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "push_subscription" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"actorId" TEXT NOT NULL,
	"endpoint" TEXT NOT NULL,
	"p256dh" TEXT NOT NULL,
	"auth" TEXT NOT NULL,
	"active" BOOLEAN NOT NULL DEFAULT true,
	"createdAt" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
	"lastSeenAt" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
	CONSTRAINT "push_subscription_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "reminder_delivery" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"dogId" TEXT NOT NULL,
	"actionTypeId" TEXT NOT NULL,
	"ruleKey" TEXT NOT NULL,
	"localDate" TEXT NOT NULL,
	"sentAt" DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')),
	CONSTRAINT "reminder_delivery_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "dog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "reminder_delivery_actionTypeId_fkey" FOREIGN KEY ("actionTypeId") REFERENCES "action_type" ("key") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "actor_name_key" ON "actor"("name");
CREATE UNIQUE INDEX "actor_code_key" ON "actor"("code");
CREATE UNIQUE INDEX "dog_name_key" ON "dog"("name");
CREATE INDEX "dog_event_dogId_actionTypeId_occurredAt_idx" ON "dog_event"("dogId", "actionTypeId", "occurredAt" DESC);
CREATE INDEX "dog_event_actorId_idx" ON "dog_event"("actorId");
CREATE INDEX "dog_event_occurredAt_idx" ON "dog_event"("occurredAt");
CREATE INDEX "session_actorId_idx" ON "session"("actorId");
CREATE UNIQUE INDEX "push_subscription_endpoint_key" ON "push_subscription"("endpoint");
CREATE INDEX "push_subscription_actorId_idx" ON "push_subscription"("actorId");
CREATE UNIQUE INDEX "reminder_delivery_dogId_actionTypeId_ruleKey_localDate_key" ON "reminder_delivery"("dogId", "actionTypeId", "ruleKey", "localDate");
CREATE INDEX "reminder_delivery_sentAt_idx" ON "reminder_delivery"("sentAt");
