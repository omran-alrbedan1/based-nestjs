-- Align the database to the current Prisma schema: primary keys and foreign
-- keys are integer/autoincrement instead of UUID, matching the controllers'
-- ParseIntPipe usage and the generated client. Safe on an empty development
-- database; the original UUID migrations created columns without defaults, so
-- Prisma-generated inserts (SERIAL ids) failed with null constraint violations.
ALTER TABLE "maintenance_card_condition_options" DROP CONSTRAINT "maintenance_card_condition_options_conditionOptionId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_card_condition_options" DROP CONSTRAINT "maintenance_card_condition_options_maintenanceCardId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_card_item_options" DROP CONSTRAINT "maintenance_card_item_options_itemOptionId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_card_item_options" DROP CONSTRAINT "maintenance_card_item_options_maintenanceCardId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_card_photos" DROP CONSTRAINT "maintenance_card_photos_maintenanceCardId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_card_photos" DROP CONSTRAINT "maintenance_card_photos_uploadedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_card_required_works" DROP CONSTRAINT "maintenance_card_required_works_maintenanceCardId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_card_status_events" DROP CONSTRAINT "maintenance_card_status_events_changedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_card_status_events" DROP CONSTRAINT "maintenance_card_status_events_maintenanceCardId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_card_visit_reasons" DROP CONSTRAINT "maintenance_card_visit_reasons_maintenanceCardId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_card_visit_reasons" DROP CONSTRAINT "maintenance_card_visit_reasons_visitReasonId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_cards" DROP CONSTRAINT "maintenance_cards_closedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_cards" DROP CONSTRAINT "maintenance_cards_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_cards" DROP CONSTRAINT "maintenance_cards_customerId_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_cards" DROP CONSTRAINT "maintenance_cards_vehicleOwnershipId_customerId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_condition_options" DROP CONSTRAINT "vehicle_condition_options_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_item_options" DROP CONSTRAINT "vehicle_item_options_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_ownerships" DROP CONSTRAINT "vehicle_ownerships_customerId_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_ownerships" DROP CONSTRAINT "vehicle_ownerships_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "visit_reasons" DROP CONSTRAINT "visit_reasons_createdByUserId_fkey";

-- AlterTable
ALTER TABLE "customers" DROP CONSTRAINT "customers_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "maintenance_card_condition_options" DROP CONSTRAINT "maintenance_card_condition_options_pkey",
DROP COLUMN "maintenanceCardId",
ADD COLUMN     "maintenanceCardId" INTEGER NOT NULL,
DROP COLUMN "conditionOptionId",
ADD COLUMN     "conditionOptionId" INTEGER NOT NULL,
ADD CONSTRAINT "maintenance_card_condition_options_pkey" PRIMARY KEY ("maintenanceCardId", "conditionOptionId");

-- AlterTable
ALTER TABLE "maintenance_card_item_options" DROP CONSTRAINT "maintenance_card_item_options_pkey",
DROP COLUMN "maintenanceCardId",
ADD COLUMN     "maintenanceCardId" INTEGER NOT NULL,
DROP COLUMN "itemOptionId",
ADD COLUMN     "itemOptionId" INTEGER NOT NULL,
ADD CONSTRAINT "maintenance_card_item_options_pkey" PRIMARY KEY ("maintenanceCardId", "itemOptionId");

-- AlterTable
ALTER TABLE "maintenance_card_photos" DROP CONSTRAINT "maintenance_card_photos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "maintenanceCardId",
ADD COLUMN     "maintenanceCardId" INTEGER NOT NULL,
DROP COLUMN "uploadedByUserId",
ADD COLUMN     "uploadedByUserId" INTEGER NOT NULL,
ADD CONSTRAINT "maintenance_card_photos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "maintenance_card_required_works" DROP CONSTRAINT "maintenance_card_required_works_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "maintenanceCardId",
ADD COLUMN     "maintenanceCardId" INTEGER NOT NULL,
ADD CONSTRAINT "maintenance_card_required_works_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "maintenance_card_status_events" DROP CONSTRAINT "maintenance_card_status_events_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "maintenanceCardId",
ADD COLUMN     "maintenanceCardId" INTEGER NOT NULL,
DROP COLUMN "changedByUserId",
ADD COLUMN     "changedByUserId" INTEGER NOT NULL,
ADD CONSTRAINT "maintenance_card_status_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "maintenance_card_visit_reasons" DROP CONSTRAINT "maintenance_card_visit_reasons_pkey",
DROP COLUMN "maintenanceCardId",
ADD COLUMN     "maintenanceCardId" INTEGER NOT NULL,
DROP COLUMN "visitReasonId",
ADD COLUMN     "visitReasonId" INTEGER NOT NULL,
ADD CONSTRAINT "maintenance_card_visit_reasons_pkey" PRIMARY KEY ("maintenanceCardId", "visitReasonId");

-- AlterTable
ALTER TABLE "maintenance_cards" DROP CONSTRAINT "maintenance_cards_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "customerId",
ADD COLUMN     "customerId" INTEGER NOT NULL,
DROP COLUMN "vehicleOwnershipId",
ADD COLUMN     "vehicleOwnershipId" INTEGER NOT NULL,
DROP COLUMN "createdByUserId",
ADD COLUMN     "createdByUserId" INTEGER NOT NULL,
DROP COLUMN "closedByUserId",
ADD COLUMN     "closedByUserId" INTEGER,
ADD CONSTRAINT "maintenance_cards_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "vehicle_condition_options" DROP CONSTRAINT "vehicle_condition_options_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "createdByUserId",
ADD COLUMN     "createdByUserId" INTEGER NOT NULL,
ADD CONSTRAINT "vehicle_condition_options_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "vehicle_item_options" DROP CONSTRAINT "vehicle_item_options_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "createdByUserId",
ADD COLUMN     "createdByUserId" INTEGER NOT NULL,
ADD CONSTRAINT "vehicle_item_options_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "vehicle_ownerships" DROP CONSTRAINT "vehicle_ownerships_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "vehicleId",
ADD COLUMN     "vehicleId" INTEGER NOT NULL,
DROP COLUMN "customerId",
ADD COLUMN     "customerId" INTEGER NOT NULL,
ADD CONSTRAINT "vehicle_ownerships_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "visit_reasons" DROP CONSTRAINT "visit_reasons_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "createdByUserId",
ADD COLUMN     "createdByUserId" INTEGER NOT NULL,
ADD CONSTRAINT "visit_reasons_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "maintenance_card_condition_options_conditionOptionId_idx" ON "maintenance_card_condition_options"("conditionOptionId");

-- CreateIndex
CREATE INDEX "maintenance_card_item_options_itemOptionId_idx" ON "maintenance_card_item_options"("itemOptionId");

-- CreateIndex
CREATE INDEX "maintenance_card_photos_maintenanceCardId_displayOrder_idx" ON "maintenance_card_photos"("maintenanceCardId", "displayOrder");

-- CreateIndex
CREATE INDEX "maintenance_card_photos_uploadedByUserId_idx" ON "maintenance_card_photos"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "maintenance_card_required_works_maintenanceCardId_idx" ON "maintenance_card_required_works"("maintenanceCardId");

-- CreateIndex
CREATE INDEX "maintenance_card_required_works_maintenanceCardId_status_idx" ON "maintenance_card_required_works"("maintenanceCardId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_card_required_works_maintenanceCardId_displayOr_key" ON "maintenance_card_required_works"("maintenanceCardId", "displayOrder");

-- CreateIndex
CREATE INDEX "maintenance_card_status_events_maintenanceCardId_createdAt_idx" ON "maintenance_card_status_events"("maintenanceCardId", "createdAt");

-- CreateIndex
CREATE INDEX "maintenance_card_status_events_changedByUserId_idx" ON "maintenance_card_status_events"("changedByUserId");

-- CreateIndex
CREATE INDEX "maintenance_card_visit_reasons_visitReasonId_idx" ON "maintenance_card_visit_reasons"("visitReasonId");

-- CreateIndex
CREATE INDEX "maintenance_cards_customerId_idx" ON "maintenance_cards"("customerId");

-- CreateIndex
CREATE INDEX "maintenance_cards_vehicleOwnershipId_idx" ON "maintenance_cards"("vehicleOwnershipId");

-- CreateIndex
CREATE INDEX "maintenance_cards_createdByUserId_idx" ON "maintenance_cards"("createdByUserId");

-- CreateIndex
CREATE INDEX "maintenance_cards_closedByUserId_idx" ON "maintenance_cards"("closedByUserId");

-- CreateIndex
CREATE INDEX "vehicle_condition_options_createdByUserId_idx" ON "vehicle_condition_options"("createdByUserId");

-- CreateIndex
CREATE INDEX "vehicle_item_options_createdByUserId_idx" ON "vehicle_item_options"("createdByUserId");

-- CreateIndex
CREATE INDEX "vehicle_ownerships_vehicleId_startedAt_idx" ON "vehicle_ownerships"("vehicleId", "startedAt");

-- CreateIndex
CREATE INDEX "vehicle_ownerships_customerId_startedAt_idx" ON "vehicle_ownerships"("customerId", "startedAt");

-- CreateIndex
CREATE INDEX "vehicle_ownerships_vehicleId_endedAt_idx" ON "vehicle_ownerships"("vehicleId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_ownerships_id_customerId_key" ON "vehicle_ownerships"("id", "customerId");

-- CreateIndex
CREATE INDEX "visit_reasons_createdByUserId_idx" ON "visit_reasons"("createdByUserId");

-- AddForeignKey
ALTER TABLE "vehicle_ownerships" ADD CONSTRAINT "vehicle_ownerships_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_ownerships" ADD CONSTRAINT "vehicle_ownerships_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_cards" ADD CONSTRAINT "maintenance_cards_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_cards" ADD CONSTRAINT "maintenance_cards_vehicleOwnershipId_customerId_fkey" FOREIGN KEY ("vehicleOwnershipId", "customerId") REFERENCES "vehicle_ownerships"("id", "customerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_cards" ADD CONSTRAINT "maintenance_cards_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_cards" ADD CONSTRAINT "maintenance_cards_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_status_events" ADD CONSTRAINT "maintenance_card_status_events_maintenanceCardId_fkey" FOREIGN KEY ("maintenanceCardId") REFERENCES "maintenance_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_status_events" ADD CONSTRAINT "maintenance_card_status_events_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_reasons" ADD CONSTRAINT "visit_reasons_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_condition_options" ADD CONSTRAINT "vehicle_condition_options_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_item_options" ADD CONSTRAINT "vehicle_item_options_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_visit_reasons" ADD CONSTRAINT "maintenance_card_visit_reasons_maintenanceCardId_fkey" FOREIGN KEY ("maintenanceCardId") REFERENCES "maintenance_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_visit_reasons" ADD CONSTRAINT "maintenance_card_visit_reasons_visitReasonId_fkey" FOREIGN KEY ("visitReasonId") REFERENCES "visit_reasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_condition_options" ADD CONSTRAINT "maintenance_card_condition_options_maintenanceCardId_fkey" FOREIGN KEY ("maintenanceCardId") REFERENCES "maintenance_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_condition_options" ADD CONSTRAINT "maintenance_card_condition_options_conditionOptionId_fkey" FOREIGN KEY ("conditionOptionId") REFERENCES "vehicle_condition_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_item_options" ADD CONSTRAINT "maintenance_card_item_options_maintenanceCardId_fkey" FOREIGN KEY ("maintenanceCardId") REFERENCES "maintenance_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_item_options" ADD CONSTRAINT "maintenance_card_item_options_itemOptionId_fkey" FOREIGN KEY ("itemOptionId") REFERENCES "vehicle_item_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_required_works" ADD CONSTRAINT "maintenance_card_required_works_maintenanceCardId_fkey" FOREIGN KEY ("maintenanceCardId") REFERENCES "maintenance_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_photos" ADD CONSTRAINT "maintenance_card_photos_maintenanceCardId_fkey" FOREIGN KEY ("maintenanceCardId") REFERENCES "maintenance_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_card_photos" ADD CONSTRAINT "maintenance_card_photos_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostgreSQL-only domain constraints that reference the recreated columns.
-- Prisma cannot express these, so re-add them after the type alignment.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE UNIQUE INDEX "vehicle_ownerships_one_current_owner"
ON "vehicle_ownerships" ("vehicleId")
WHERE "endedAt" IS NULL;

ALTER TABLE "vehicle_ownerships"
  ADD CONSTRAINT "vehicle_ownerships_no_overlapping_periods"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("startedAt", COALESCE("endedAt", 'infinity'::timestamptz), '[)') WITH &&
  );

ALTER TABLE "maintenance_cards"
  ADD CONSTRAINT "maintenance_cards_closed_state_check"
  CHECK (
    ("status" = 'OPEN' AND "closedAt" IS NULL AND "closedByUserId" IS NULL)
    OR
    ("status" = 'CLOSED' AND "closedAt" IS NOT NULL AND "closedByUserId" IS NOT NULL)
  );