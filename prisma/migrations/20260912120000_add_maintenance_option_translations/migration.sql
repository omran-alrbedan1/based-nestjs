-- Add localized labels to the maintenance-card configurable options.
--
-- The old single `label` column held English-only values. It is kept during
-- the migration so that:
--   1. `label_en` is backfilled from the existing `label` values,
--   2. `label_ar` is populated with accurate Arabic translations for every
--      known seeded `code` (the set defined by prisma/seed.ts),
--   3. rows created at runtime with unknown codes keep a safe `label_ar`
--      placeholder equal to their English value until an admin edits it.
-- Existing option IDs are never touched because maintenance cards reference
-- these rows through their join tables.

-- 1. Add nullable localized label columns.
ALTER TABLE "visit_reasons"
  ADD COLUMN "label_en" VARCHAR(150),
  ADD COLUMN "label_ar" VARCHAR(150);

ALTER TABLE "vehicle_condition_options"
  ADD COLUMN "label_en" VARCHAR(150),
  ADD COLUMN "label_ar" VARCHAR(150);

ALTER TABLE "vehicle_item_options"
  ADD COLUMN "label_en" VARCHAR(150),
  ADD COLUMN "label_ar" VARCHAR(150);

-- 2. Carry the existing English label into label_en.
UPDATE "visit_reasons" SET "label_en" = "label";
UPDATE "vehicle_condition_options" SET "label_en" = "label";
UPDATE "vehicle_item_options" SET "label_en" = "label";

-- 3. Backfill accurate Arabic translations for every known seeded code.
UPDATE "visit_reasons" AS v
SET "label_ar" = COALESCE(t."label_ar", v."label")
FROM (
  VALUES
    ('regular_service', 'صيانة دورية'),
    ('oil_change', 'تغيير الزيت'),
    ('tire_service', 'خدمة الإطارات'),
    ('brake_service', 'خدمة الفرامل'),
    ('engine_repair', 'إصلاح المحرك'),
    ('transmission_service', 'خدمة ناقل الحركة'),
    ('electrical_issues', 'الأعطال الكهربائية'),
    ('ac_heating', 'تكييف / تدفئة'),
    ('inspection', 'الفحص الفني'),
    ('body_work', 'أعمال الهيكل'),
    ('diagnostic', 'التشخيص'),
    ('other', 'أخرى')
) AS t("code", "label_ar")
WHERE v."code" = t."code";

UPDATE "vehicle_condition_options" AS v
SET "label_ar" = COALESCE(t."label_ar", v."label")
FROM (
  VALUES
    ('body_condition', 'حالة الهيكل'),
    ('interior_condition', 'حالة المقصورة'),
    ('tire_condition', 'حالة الإطارات'),
    ('windshield_condition', 'حالة الزجاج الأمامي'),
    ('lights_condition', 'الإضاءة'),
    ('fluid_levels', 'مستويات السوائل'),
    ('battery_condition', 'حالة البطارية'),
    ('exhaust_system', 'نظام العادم')
) AS t("code", "label_ar")
WHERE v."code" = t."code";

UPDATE "vehicle_item_options" AS v
SET "label_ar" = COALESCE(t."label_ar", v."label")
FROM (
  VALUES
    ('spare_tire', 'إطار احتياطي'),
    ('jack_and_tools', 'الجك والأدوات'),
    ('floor_mats', 'فرش الأرضية'),
    ('radio_stereo', 'الراديو / الستيريو'),
    ('antenna', 'الهوائي'),
    ('side_mirrors', 'المرايا الجانبية'),
    ('hubcaps', 'أغطية العجلات'),
    ('owner_manual', 'دليل المالك'),
    ('first_aid_kit', 'حقيبة الإسعافات الأولية'),
    ('fire_extinguisher', 'طفاية الحريق')
) AS t("code", "label_ar")
WHERE v."code" = t."code";

-- 4. Rows created at runtime (unknown codes) keep their English label as a
--    placeholder so the new NOT NULL constraint can be applied safely.
UPDATE "visit_reasons" SET "label_ar" = "label" WHERE "label_ar" IS NULL;
UPDATE "vehicle_condition_options" SET "label_ar" = "label" WHERE "label_ar" IS NULL;
UPDATE "vehicle_item_options" SET "label_ar" = "label" WHERE "label_ar" IS NULL;

-- 5. Enforce the new NOT NULL contract.
ALTER TABLE "visit_reasons"
  ALTER COLUMN "label_en" SET NOT NULL,
  ALTER COLUMN "label_ar" SET NOT NULL;

ALTER TABLE "vehicle_condition_options"
  ALTER COLUMN "label_en" SET NOT NULL,
  ALTER COLUMN "label_ar" SET NOT NULL;

ALTER TABLE "vehicle_item_options"
  ALTER COLUMN "label_en" SET NOT NULL,
  ALTER COLUMN "label_ar" SET NOT NULL;

-- 6. Drop the obsolete single `label` column now that the data is preserved.
ALTER TABLE "visit_reasons" DROP COLUMN "label";
ALTER TABLE "vehicle_condition_options" DROP COLUMN "label";
ALTER TABLE "vehicle_item_options" DROP COLUMN "label";