-- CreateEnum
CREATE TYPE "MaintenanceWorkEventType" AS ENUM ('CREATED', 'UPDATED', 'STARTED', 'COMPLETED', 'CANCELLED', 'REOPENED', 'REMOVED');

-- AlterTable
ALTER TABLE "maintenance_card_required_works" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMPTZ(3),
ADD COLUMN     "cancelledByUserId" INTEGER,
ADD COLUMN     "completedByUserId" INTEGER,
ADD COLUMN     "startedAt" TIMESTAMPTZ(3),
ADD COLUMN     "startedByUserId" INTEGER;

-- CreateTable
CREATE TABLE "maintenance_work_events" (
    "id" SERIAL NOT NULL,
    "maintenanceCardId" INTEGER NOT NULL,
    "requiredWorkId" INTEGER,
    "eventType" "MaintenanceWorkEventType" NOT NULL,
    "fromStatus" "MaintenanceWorkStatus",
    "toStatus" "MaintenanceWorkStatus",
    "workDescriptionSnapshot" TEXT NOT NULL,
    "reason" TEXT,
    "changedByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_work_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_work_events_maintenanceCardId_createdAt_idx" ON "maintenance_work_events"("maintenanceCardId", "createdAt");

-- CreateIndex
CREATE INDEX "maintenance_work_events_requiredWorkId_createdAt_idx" ON "maintenance_work_events"("requiredWorkId", "createdAt");

-- CreateIndex
CREATE INDEX "maintenance_work_events_changedByUserId_idx" ON "maintenance_work_events"("changedByUserId");

-- CreateIndex
CREATE INDEX "maintenance_card_required_works_startedByUserId_idx" ON "maintenance_card_required_works"("startedByUserId");

-- CreateIndex
CREATE INDEX "maintenance_card_required_works_completedByUserId_idx" ON "maintenance_card_required_works"("completedByUserId");

-- CreateIndex
CREATE INDEX "maintenance_card_required_works_cancelledByUserId_idx" ON "maintenance_card_required_works"("cancelledByUserId");

-- AddForeignKey
ALTER TABLE "maintenance_card_required_works" ADD CONSTRAINT "maintenance_card_required_works_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_required_works" ADD CONSTRAINT "maintenance_card_required_works_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_required_works" ADD CONSTRAINT "maintenance_card_required_works_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_events" ADD CONSTRAINT "maintenance_work_events_maintenanceCardId_fkey" FOREIGN KEY ("maintenanceCardId") REFERENCES "maintenance_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_work_events" ADD CONSTRAINT "maintenance_work_events_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
