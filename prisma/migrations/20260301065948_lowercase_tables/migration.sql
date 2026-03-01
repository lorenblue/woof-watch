/*
  Warnings:

  - You are about to drop the `ActionType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Actor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Dog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DogEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PushSubscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DogEvent" DROP CONSTRAINT "DogEvent_actionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "DogEvent" DROP CONSTRAINT "DogEvent_actorId_fkey";

-- DropForeignKey
ALTER TABLE "DogEvent" DROP CONSTRAINT "DogEvent_dogId_fkey";

-- DropForeignKey
ALTER TABLE "DogEvent" DROP CONSTRAINT "DogEvent_undoneById_fkey";

-- DropForeignKey
ALTER TABLE "PushSubscription" DROP CONSTRAINT "PushSubscription_actorId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_actorId_fkey";

-- DropTable
DROP TABLE "ActionType";

-- DropTable
DROP TABLE "Actor";

-- DropTable
DROP TABLE "Dog";

-- DropTable
DROP TABLE "DogEvent";

-- DropTable
DROP TABLE "PushSubscription";

-- DropTable
DROP TABLE "Session";

-- CreateTable
CREATE TABLE "actor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "codeUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "dog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_type" (
    "key" TEXT NOT NULL,

    CONSTRAINT "action_type_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "dog_event" (
    "id" TEXT NOT NULL,
    "dogId" TEXT NOT NULL,
    "actionTypeId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "undoneAt" TIMESTAMP(3),
    "undoneById" TEXT,

    CONSTRAINT "dog_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscription" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "actor_name_key" ON "actor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "actor_code_key" ON "actor"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dog_name_key" ON "dog"("name");

-- CreateIndex
CREATE INDEX "dog_event_dogId_actionTypeId_undoneAt_occurredAt_idx" ON "dog_event"("dogId", "actionTypeId", "undoneAt", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "dog_event_actorId_idx" ON "dog_event"("actorId");

-- CreateIndex
CREATE INDEX "dog_event_occurredAt_idx" ON "dog_event"("occurredAt");

-- CreateIndex
CREATE INDEX "session_actorId_idx" ON "session"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscription_endpoint_key" ON "push_subscription"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscription_actorId_idx" ON "push_subscription"("actorId");

-- AddForeignKey
ALTER TABLE "dog_event" ADD CONSTRAINT "dog_event_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dog_event" ADD CONSTRAINT "dog_event_actionTypeId_fkey" FOREIGN KEY ("actionTypeId") REFERENCES "action_type"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dog_event" ADD CONSTRAINT "dog_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dog_event" ADD CONSTRAINT "dog_event_undoneById_fkey" FOREIGN KEY ("undoneById") REFERENCES "actor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
