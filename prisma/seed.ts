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
  const email = 'admin@gmail.com';
  const password = '123456789';
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
    { code: 'regular_service', label: 'Regular Service', displayOrder: 1 },
    { code: 'oil_change', label: 'Oil Change', displayOrder: 2 },
    { code: 'tire_service', label: 'Tire Service', displayOrder: 3 },
    { code: 'brake_service', label: 'Brake Service', displayOrder: 4 },
    { code: 'engine_repair', label: 'Engine Repair', displayOrder: 5 },
    { code: 'transmission_service', label: 'Transmission Service', displayOrder: 6 },
    { code: 'electrical_issues', label: 'Electrical Issues', displayOrder: 7 },
    { code: 'ac_heating', label: 'AC / Heating', displayOrder: 8 },
    { code: 'inspection', label: 'Inspection', displayOrder: 9 },
    { code: 'body_work', label: 'Body Work', displayOrder: 10 },
    { code: 'diagnostic', label: 'Diagnostic', displayOrder: 11 },
    { code: 'other', label: 'Other', displayOrder: 12 },
  ];

  for (const row of rows) {
    await prisma.visitReason.upsert({
      where: { code: row.code },
      update: {
        label: row.label,
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
    { code: 'body_condition', label: 'Body Condition', displayOrder: 1 },
    { code: 'interior_condition', label: 'Interior Condition', displayOrder: 2 },
    { code: 'tire_condition', label: 'Tire Condition', displayOrder: 3 },
    { code: 'windshield_condition', label: 'Windshield Condition', displayOrder: 4 },
    { code: 'lights_condition', label: 'Lights', displayOrder: 5 },
    { code: 'fluid_levels', label: 'Fluid Levels', displayOrder: 6 },
    { code: 'battery_condition', label: 'Battery Condition', displayOrder: 7 },
    { code: 'exhaust_system', label: 'Exhaust System', displayOrder: 8 },
  ];

  for (const row of rows) {
    await prisma.vehicleConditionOption.upsert({
      where: { code: row.code },
      update: {
        label: row.label,
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
    { code: 'spare_tire', label: 'Spare Tire', displayOrder: 1 },
    { code: 'jack_and_tools', label: 'Jack & Tools', displayOrder: 2 },
    { code: 'floor_mats', label: 'Floor Mats', displayOrder: 3 },
    { code: 'radio_stereo', label: 'Radio / Stereo', displayOrder: 4 },
    { code: 'antenna', label: 'Antenna', displayOrder: 5 },
    { code: 'side_mirrors', label: 'Side Mirrors', displayOrder: 6 },
    { code: 'hubcaps', label: 'Hubcaps', displayOrder: 7 },
    { code: 'owner_manual', label: 'Owner Manual', displayOrder: 8 },
    { code: 'first_aid_kit', label: 'First Aid Kit', displayOrder: 9 },
    { code: 'fire_extinguisher', label: 'Fire Extinguisher', displayOrder: 10 },
  ];

  for (const row of rows) {
    await prisma.vehicleItemOption.upsert({
      where: { code: row.code },
      update: {
        label: row.label,
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