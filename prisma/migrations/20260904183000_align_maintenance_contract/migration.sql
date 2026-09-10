-- The sequence owns collision-free maintenance-card numbers. Existing numeric
-- suffixes are considered when initializing it, so applying this migration is safe
-- against already-created RP cards.
CREATE SEQUENCE "maintenance_card_number_seq";

SELECT setval(
  'maintenance_card_number_seq',
  COALESCE(
    (SELECT MAX((regexp_match("cardNumber", '([0-9]+)$'))[1]::bigint) FROM "maintenance_cards"),
    0
  ) + 1,
  false
);

CREATE TYPE "MaintenanceWorkStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

ALTER TABLE "maintenance_card_required_works"
  ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "status" "MaintenanceWorkStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "estimatedCost" DECIMAL(12,2),
  ADD COLUMN "completedAt" TIMESTAMPTZ(3);

CREATE INDEX "maintenance_card_required_works_maintenanceCardId_status_idx"
  ON "maintenance_card_required_works"("maintenanceCardId", "status");

ALTER TABLE "maintenance_card_required_works"
  ADD CONSTRAINT "maintenance_card_required_works_estimated_cost_check"
  CHECK ("estimatedCost" IS NULL OR "estimatedCost" >= 0),
  ADD CONSTRAINT "maintenance_card_required_works_completion_check"
  CHECK (
    ("status" = 'COMPLETED' AND "completedAt" IS NOT NULL)
    OR ("status" <> 'COMPLETED' AND "completedAt" IS NULL)
  );
