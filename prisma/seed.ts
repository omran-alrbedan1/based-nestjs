import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../generated/prisma/client';

const SALT_ROUNDS = 12;

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function seedSuperAdmin(): Promise<number> {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? 'admin@gmail.com').trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD ?? '123456789';
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      email,
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
    select: { id: true, email: true, role: true },
  });

  console.log(`  [user] ${admin.email} (${admin.role})`);
  return admin.id;
}

async function seedVisitReasons(adminId: number): Promise<void> {
  const rows = [
    { code: 'regular_service', labelEn: 'Regular Service', labelAr: 'صيانة دورية', displayOrder: 1 },
    { code: 'oil_change', labelEn: 'Oil Change', labelAr: 'تغيير الزيت', displayOrder: 2 },
    { code: 'tire_service', labelEn: 'Tire Service', labelAr: 'خدمة الإطارات', displayOrder: 3 },
    { code: 'brake_service', labelEn: 'Brake Service', labelAr: 'خدمة الفرامل', displayOrder: 4 },
    { code: 'engine_repair', labelEn: 'Engine Repair', labelAr: 'إصلاح المحرك', displayOrder: 5 },
    {
      code: 'transmission_service',
      labelEn: 'Transmission Service',
      labelAr: 'خدمة ناقل الحركة',
      displayOrder: 6,
    },
    {
      code: 'electrical_issues',
      labelEn: 'Electrical Issues',
      labelAr: 'الأعطال الكهربائية',
      displayOrder: 7,
    },
    { code: 'ac_heating', labelEn: 'AC / Heating', labelAr: 'تكييف / تدفئة', displayOrder: 8 },
    { code: 'inspection', labelEn: 'Inspection', labelAr: 'الفحص الفني', displayOrder: 9 },
    { code: 'body_work', labelEn: 'Body Work', labelAr: 'أعمال الهيكل', displayOrder: 10 },
    { code: 'diagnostic', labelEn: 'Diagnostic', labelAr: 'التشخيص', displayOrder: 11 },
    { code: 'other', labelEn: 'Other', labelAr: 'أخرى', displayOrder: 12 },
  ];

  for (const row of rows) {
    await prisma.visitReason.upsert({
      where: { code: row.code },
      update: {
        labelEn: row.labelEn,
        labelAr: row.labelAr,
        displayOrder: row.displayOrder,
        isActive: true,
      },
      create: {
        ...row,
        isActive: true,
        createdByUserId: adminId,
      },
    });
  }

  console.log(`  [visitReason] ${rows.length} seeded`);
}

async function seedVehicleConditionOptions(adminId: number): Promise<void> {
  const rows = [
    { code: 'body_condition', labelEn: 'Body Condition', labelAr: 'حالة الهيكل', displayOrder: 1 },
    {
      code: 'interior_condition',
      labelEn: 'Interior Condition',
      labelAr: 'حالة المقصورة',
      displayOrder: 2,
    },
    { code: 'tire_condition', labelEn: 'Tire Condition', labelAr: 'حالة الإطارات', displayOrder: 3 },
    {
      code: 'windshield_condition',
      labelEn: 'Windshield Condition',
      labelAr: 'حالة الزجاج الأمامي',
      displayOrder: 4,
    },
    { code: 'lights_condition', labelEn: 'Lights', labelAr: 'الإضاءة', displayOrder: 5 },
    { code: 'fluid_levels', labelEn: 'Fluid Levels', labelAr: 'مستويات السوائل', displayOrder: 6 },
    {
      code: 'battery_condition',
      labelEn: 'Battery Condition',
      labelAr: 'حالة البطارية',
      displayOrder: 7,
    },
    { code: 'exhaust_system', labelEn: 'Exhaust System', labelAr: 'نظام العادم', displayOrder: 8 },
  ];

  for (const row of rows) {
    await prisma.vehicleConditionOption.upsert({
      where: { code: row.code },
      update: {
        labelEn: row.labelEn,
        labelAr: row.labelAr,
        displayOrder: row.displayOrder,
        isActive: true,
      },
      create: {
        ...row,
        isActive: true,
        createdByUserId: adminId,
      },
    });
  }

  console.log(`  [vehicleConditionOption] ${rows.length} seeded`);
}

async function seedVehicleItemOptions(adminId: number): Promise<void> {
  const rows = [
    { code: 'spare_tire', labelEn: 'Spare Tire', labelAr: 'إطار احتياطي', displayOrder: 1 },
    { code: 'jack_and_tools', labelEn: 'Jack & Tools', labelAr: 'الجك والأدوات', displayOrder: 2 },
    { code: 'floor_mats', labelEn: 'Floor Mats', labelAr: 'فرش الأرضية', displayOrder: 3 },
    { code: 'radio_stereo', labelEn: 'Radio / Stereo', labelAr: 'الراديو / الستيريو', displayOrder: 4 },
    { code: 'antenna', labelEn: 'Antenna', labelAr: 'الهوائي', displayOrder: 5 },
    { code: 'side_mirrors', labelEn: 'Side Mirrors', labelAr: 'المرايا الجانبية', displayOrder: 6 },
    { code: 'hubcaps', labelEn: 'Hubcaps', labelAr: 'أغطية العجلات', displayOrder: 7 },
    { code: 'owner_manual', labelEn: 'Owner Manual', labelAr: 'دليل المالك', displayOrder: 8 },
    { code: 'first_aid_kit', labelEn: 'First Aid Kit', labelAr: 'حقيبة الإسعافات الأولية', displayOrder: 9 },
    { code: 'fire_extinguisher', labelEn: 'Fire Extinguisher', labelAr: 'طفاية الحريق', displayOrder: 10 },
  ];

  for (const row of rows) {
    await prisma.vehicleItemOption.upsert({
      where: { code: row.code },
      update: {
        labelEn: row.labelEn,
        labelAr: row.labelAr,
        displayOrder: row.displayOrder,
        isActive: true,
      },
      create: {
        ...row,
        isActive: true,
        createdByUserId: adminId,
      },
    });
  }

  console.log(`  [vehicleItemOption] ${rows.length} seeded`);
}

async function main(): Promise<void> {
  console.log('Seeding database...');

  const adminId = await seedSuperAdmin();

  await seedVisitReasons(adminId);
  await seedVehicleConditionOptions(adminId);
  await seedVehicleItemOptions(adminId);

  console.log('Seeding complete.');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });