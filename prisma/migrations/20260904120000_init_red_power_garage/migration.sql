-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "TransmissionType" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "FuelLevel" AS ENUM ('EMPTY', 'QUARTER', 'HALF', 'THREE_QUARTERS', 'FULL');

-- CreateEnum
CREATE TYPE "MaintenanceCardStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" VARCHAR(100),
    "lastName" VARCHAR(100),
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(254),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "make" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "manufactureYear" INTEGER NOT NULL,
    "plateNumber" VARCHAR(30) NOT NULL,
    "color" VARCHAR(50),
    "vin" VARCHAR(17),
    "transmission" "TransmissionType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_ownerships" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "endedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicle_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_cards" (
    "id" UUID NOT NULL,
    "cardNumber" VARCHAR(50) NOT NULL,
    "customerId" UUID NOT NULL,
    "vehicleOwnershipId" UUID NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL,
    "expectedDeliveryAt" TIMESTAMPTZ(3),
    "mileage" INTEGER NOT NULL,
    "fuelLevel" "FuelLevel" NOT NULL,
    "customerComplaint" TEXT,
    "inspectionNotes" TEXT,
    "status" "MaintenanceCardStatus" NOT NULL DEFAULT 'OPEN',
    "customerApproved" BOOLEAN NOT NULL DEFAULT false,
    "customerApprovalName" VARCHAR(150),
    "customerApprovedAt" TIMESTAMPTZ(3),
    "signatureStorageKey" VARCHAR(500),
    "createdByUserId" UUID NOT NULL,
    "closedByUserId" UUID,
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "maintenance_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_card_status_events" (
    "id" UUID NOT NULL,
    "maintenanceCardId" UUID NOT NULL,
    "fromStatus" "MaintenanceCardStatus",
    "toStatus" "MaintenanceCardStatus" NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_card_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_reasons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "visit_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_condition_options" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicle_condition_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_item_options" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicle_item_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_card_visit_reasons" (
    "maintenanceCardId" UUID NOT NULL,
    "visitReasonId" UUID NOT NULL,
    "selectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_card_visit_reasons_pkey" PRIMARY KEY ("maintenanceCardId","visitReasonId")
);

-- CreateTable
CREATE TABLE "maintenance_card_condition_options" (
    "maintenanceCardId" UUID NOT NULL,
    "conditionOptionId" UUID NOT NULL,
    "selectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_card_condition_options_pkey" PRIMARY KEY ("maintenanceCardId","conditionOptionId")
);

-- CreateTable
CREATE TABLE "maintenance_card_item_options" (
    "maintenanceCardId" UUID NOT NULL,
    "itemOptionId" UUID NOT NULL,
    "selectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_card_item_options_pkey" PRIMARY KEY ("maintenanceCardId","itemOptionId")
);

-- CreateTable
CREATE TABLE "maintenance_card_required_works" (
    "id" UUID NOT NULL,
    "maintenanceCardId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "maintenance_card_required_works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_card_photos" (
    "id" UUID NOT NULL,
    "maintenanceCardId" UUID NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "originalFileName" VARCHAR(255),
    "mimeType" VARCHAR(100),
    "sizeBytes" BIGINT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_card_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_isActive_idx" ON "customers"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE INDEX "vehicles_plateNumber_idx" ON "vehicles"("plateNumber");

-- CreateIndex
CREATE INDEX "vehicles_plateNumber_isActive_idx" ON "vehicles"("plateNumber", "isActive");

-- CreateIndex
CREATE INDEX "vehicles_make_model_idx" ON "vehicles"("make", "model");

-- CreateIndex
CREATE INDEX "vehicles_isActive_idx" ON "vehicles"("isActive");

-- CreateIndex
CREATE INDEX "vehicle_ownerships_vehicleId_startedAt_idx" ON "vehicle_ownerships"("vehicleId", "startedAt");

-- CreateIndex
CREATE INDEX "vehicle_ownerships_customerId_startedAt_idx" ON "vehicle_ownerships"("customerId", "startedAt");

-- CreateIndex
CREATE INDEX "vehicle_ownerships_vehicleId_endedAt_idx" ON "vehicle_ownerships"("vehicleId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_ownerships_id_customerId_key" ON "vehicle_ownerships"("id", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_cards_cardNumber_key" ON "maintenance_cards"("cardNumber");

-- CreateIndex
CREATE INDEX "maintenance_cards_customerId_idx" ON "maintenance_cards"("customerId");

-- CreateIndex
CREATE INDEX "maintenance_cards_vehicleOwnershipId_idx" ON "maintenance_cards"("vehicleOwnershipId");

-- CreateIndex
CREATE INDEX "maintenance_cards_status_idx" ON "maintenance_cards"("status");

-- CreateIndex
CREATE INDEX "maintenance_cards_receivedAt_idx" ON "maintenance_cards"("receivedAt");

-- CreateIndex
CREATE INDEX "maintenance_cards_expectedDeliveryAt_idx" ON "maintenance_cards"("expectedDeliveryAt");

-- CreateIndex
CREATE INDEX "maintenance_cards_createdByUserId_idx" ON "maintenance_cards"("createdByUserId");

-- CreateIndex
CREATE INDEX "maintenance_cards_closedByUserId_idx" ON "maintenance_cards"("closedByUserId");

-- CreateIndex
CREATE INDEX "maintenance_card_status_events_maintenanceCardId_createdAt_idx" ON "maintenance_card_status_events"("maintenanceCardId", "createdAt");

-- CreateIndex
CREATE INDEX "maintenance_card_status_events_changedByUserId_idx" ON "maintenance_card_status_events"("changedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "visit_reasons_code_key" ON "visit_reasons"("code");

-- CreateIndex
CREATE INDEX "visit_reasons_isActive_displayOrder_idx" ON "visit_reasons"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "visit_reasons_createdByUserId_idx" ON "visit_reasons"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_condition_options_code_key" ON "vehicle_condition_options"("code");

-- CreateIndex
CREATE INDEX "vehicle_condition_options_isActive_displayOrder_idx" ON "vehicle_condition_options"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "vehicle_condition_options_createdByUserId_idx" ON "vehicle_condition_options"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_item_options_code_key" ON "vehicle_item_options"("code");

-- CreateIndex
CREATE INDEX "vehicle_item_options_isActive_displayOrder_idx" ON "vehicle_item_options"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "vehicle_item_options_createdByUserId_idx" ON "vehicle_item_options"("createdByUserId");

-- CreateIndex
CREATE INDEX "maintenance_card_visit_reasons_visitReasonId_idx" ON "maintenance_card_visit_reasons"("visitReasonId");

-- CreateIndex
CREATE INDEX "maintenance_card_condition_options_conditionOptionId_idx" ON "maintenance_card_condition_options"("conditionOptionId");

-- CreateIndex
CREATE INDEX "maintenance_card_item_options_itemOptionId_idx" ON "maintenance_card_item_options"("itemOptionId");

-- CreateIndex
CREATE INDEX "maintenance_card_required_works_maintenanceCardId_idx" ON "maintenance_card_required_works"("maintenanceCardId");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_card_required_works_maintenanceCardId_displayOr_key" ON "maintenance_card_required_works"("maintenanceCardId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_card_photos_storageKey_key" ON "maintenance_card_photos"("storageKey");

-- CreateIndex
CREATE INDEX "maintenance_card_photos_maintenanceCardId_displayOrder_idx" ON "maintenance_card_photos"("maintenanceCardId", "displayOrder");

-- CreateIndex
CREATE INDEX "maintenance_card_photos_uploadedByUserId_idx" ON "maintenance_card_photos"("uploadedByUserId");

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


-- PostgreSQL-only domain constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE UNIQUE INDEX "vehicle_ownerships_one_current_owner"
ON "vehicle_ownerships" ("vehicleId")
WHERE "endedAt" IS NULL;

ALTER TABLE "vehicle_ownerships"
  ADD CONSTRAINT "vehicle_ownerships_ended_after_started_check"
  CHECK ("endedAt" IS NULL OR "endedAt" > "startedAt"),
  ADD CONSTRAINT "vehicle_ownerships_no_overlapping_periods"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("startedAt", COALESCE("endedAt", 'infinity'::timestamptz), '[)') WITH &&
  );

ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_manufacture_year_check"
  CHECK ("manufactureYear" BETWEEN 1886 AND 9999);

ALTER TABLE "maintenance_cards"
  ADD CONSTRAINT "maintenance_cards_mileage_check"
  CHECK ("mileage" >= 0),
  ADD CONSTRAINT "maintenance_cards_expected_delivery_check"
  CHECK ("expectedDeliveryAt" IS NULL OR "expectedDeliveryAt" >= "receivedAt"),
  ADD CONSTRAINT "maintenance_cards_closed_state_check"
  CHECK (
    ("status" = 'OPEN' AND "closedAt" IS NULL AND "closedByUserId" IS NULL)
    OR
    ("status" = 'CLOSED' AND "closedAt" IS NOT NULL AND "closedByUserId" IS NOT NULL)
  ),
  ADD CONSTRAINT "maintenance_cards_customer_approval_check"
  CHECK (
    NOT "customerApproved"
    OR (
      "customerApprovalName" IS NOT NULL
      AND btrim("customerApprovalName") <> ''
      AND "customerApprovedAt" IS NOT NULL
    )
  );

ALTER TABLE "visit_reasons"
  ADD CONSTRAINT "visit_reasons_display_order_check"
  CHECK ("displayOrder" >= 0);

ALTER TABLE "vehicle_condition_options"
  ADD CONSTRAINT "vehicle_condition_options_display_order_check"
  CHECK ("displayOrder" >= 0);

ALTER TABLE "vehicle_item_options"
  ADD CONSTRAINT "vehicle_item_options_display_order_check"
  CHECK ("displayOrder" >= 0);

ALTER TABLE "maintenance_card_required_works"
  ADD CONSTRAINT "maintenance_card_required_works_display_order_check"
  CHECK ("displayOrder" >= 0);

ALTER TABLE "maintenance_card_photos"
  ADD CONSTRAINT "maintenance_card_photos_display_order_check"
  CHECK ("displayOrder" >= 0),
  ADD CONSTRAINT "maintenance_card_photos_size_bytes_check"
  CHECK ("sizeBytes" IS NULL OR "sizeBytes" >= 0);

