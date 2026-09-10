/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from './prisma/prisma.service';
import { getUtcDayRange } from './modules/dashboard/dashboard-date-range';

describe('Task 4 business flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let request: typeof import('supertest').default;
  let adminToken: string;
  let superAdminToken: string;
  const marker = `T4${Date.now()}`;
  const adminEmail = `${marker.toLowerCase()}-admin@example.com`;
  const superEmail = `${marker.toLowerCase()}-super@example.com`;
  const password = 'Task4-Test-Password1!';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.DATABASE_URL ??=
      'postgresql://postgres:rpg-local-verification-only@localhost:5436/red_power_garage?schema=public';
    process.env.JWT_SECRET = 'task4-e2e-access-secret-at-least-32-characters';
    process.env.JWT_REFRESH_SECRET = 'task4-e2e-refresh-secret-at-least-32-characters';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    process.env.SWAGGER_ENABLED = 'false';

    // Runtime loading lets the suite set safe test configuration before AppModule loads.
    const { Test } = require('@nestjs/testing') as typeof import('@nestjs/testing');
    const { AppModule } = require('./app.module') as typeof import('./app.module');

    const prismaModule =
      require('./prisma/prisma.service') as typeof import('./prisma/prisma.service');
    const bcrypt = require('bcrypt') as typeof import('bcrypt');
    const supertest = require('supertest') as typeof import('supertest');
    const i18n = require('nestjs-i18n') as typeof import('nestjs-i18n');
    const { Pool } = require('pg') as typeof import('pg');
    const { ConfigService } = require('@nestjs/config') as typeof import('@nestjs/config');
    const preflight = new Pool({ connectionString: process.env.DATABASE_URL });
    await preflight.query('SELECT 1');
    await preflight.end();
    request = supertest.default ?? (supertest as unknown as typeof request);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef.get(ConfigService).get('DATABASE_URL')).toBe(process.env.DATABASE_URL);
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new i18n.I18nValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    prisma = app.get(prismaModule.PrismaService);
    await prisma.$connect();
    await app.init();

    const hashedPassword = await bcrypt.hash(password, 4);
    await prisma.user.createMany({
      data: [
        { email: adminEmail, password: hashedPassword, role: 'ADMIN' },
        { email: superEmail, password: hashedPassword, role: 'SUPER_ADMIN' },
      ],
    });
    adminToken = await login(adminEmail);
    superAdminToken = await login(superEmail);
  }, 30_000);

  afterAll(async () => {
    if (prisma) {
      await prisma.maintenanceCard.deleteMany({
        where: { customer: { phone: { startsWith: marker } } },
      });
      await prisma.visitReason.deleteMany({ where: { code: { startsWith: marker } } });
      const vehicles = await prisma.vehicle.findMany({
        where: { plateNumber: { startsWith: marker } },
        select: { id: true },
      });
      const vehicleIds = vehicles.map(({ id }) => id);
      await prisma.vehicleOwnership.deleteMany({ where: { vehicleId: { in: vehicleIds } } });
      await prisma.vehicle.deleteMany({ where: { id: { in: vehicleIds } } });
      await prisma.customer.deleteMany({ where: { phone: { startsWith: marker } } });
      await prisma.user.deleteMany({ where: { email: { in: [adminEmail, superEmail] } } });
    }
    await app?.close();
  });

  it('preserves responsible customers across ownership changes and enforces card roles', async () => {
    const customerA = await post('/api/v1/customers', adminToken, {
      name: `${marker} Customer A`,
      phone: `${marker}-A`,
      email: `${marker.toLowerCase()}-a@example.com`,
    });
    const customerB = await post('/api/v1/customers', adminToken, {
      name: `${marker} Customer B`,
      phone: `${marker}-B`,
      email: `${marker.toLowerCase()}-b@example.com`,
    });
    const vehicle = await post('/api/v1/vehicles', adminToken, {
      customerId: customerA.id,
      make: marker,
      model: 'Integration',
      manufactureYear: 2025,
      plateNumber: `${marker}-PLATE`,
      transmission: 'AUTOMATIC',
    });
    expect(vehicle.currentOwnership.customerId).toBe(customerA.id);

    const option = await post('/api/v1/maintenance-card-options/visit-reasons', superAdminToken, {
      code: `${marker}-VISIT`,
      label: 'Integration visit',
      displayOrder: 0,
    });
    const receivedAt = new Date(Date.now() - 60_000).toISOString();
    const firstCard = await post('/api/v1/maintenance-cards', adminToken, {
      customerId: customerA.id,
      vehicleOwnershipId: vehicle.currentOwnership.id,
      receivedAt,
      mileage: 100,
      fuelLevel: 'HALF',
      customerApproved: false,
      visitReasonIds: [option.id],
      requiredWorks: [{ description: 'Inspect brakes', displayOrder: 0 }],
    });
    const events = await prisma.maintenanceCardStatusEvent.findMany({
      where: { maintenanceCardId: firstCard.id },
    });
    expect(events).toEqual([expect.objectContaining({ fromStatus: null, toStatus: 'OPEN' })]);
    await request(app.getHttpServer())
      .post(`/api/v1/maintenance-cards/${firstCard.id}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(409);
    await patch(
      `/api/v1/maintenance-cards/${firstCard.id}/required-works/${firstCard.requiredWorks[0].id}`,
      adminToken,
      { status: 'COMPLETED' },
    );

    await patch(`/api/v1/maintenance-cards/${firstCard.id}`, adminToken, {
      inspectionNotes: 'Updated while open',
    });
    await post(`/api/v1/maintenance-cards/${firstCard.id}/close`, adminToken, {});
    await request(app.getHttpServer())
      .patch(`/api/v1/maintenance-cards/${firstCard.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ mileage: 101 })
      .expect(409);
    await request(app.getHttpServer())
      .post(`/api/v1/maintenance-cards/${firstCard.id}/reopen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(403);
    await post(`/api/v1/maintenance-cards/${firstCard.id}/reopen`, superAdminToken, {});
    await patch(`/api/v1/maintenance-cards/${firstCard.id}`, adminToken, { mileage: 101 });
    await post(`/api/v1/maintenance-cards/${firstCard.id}/close`, adminToken, {});

    const newOwnership = await post(
      `/api/v1/vehicles/${vehicle.id}/transfer-ownership`,
      adminToken,
      { customerId: customerB.id },
    );
    const secondCard = await post('/api/v1/maintenance-cards', adminToken, {
      customerId: customerB.id,
      vehicleOwnershipId: newOwnership.id,
      receivedAt: new Date().toISOString(),
      mileage: 200,
      fuelLevel: 'FULL',
      customerApproved: false,
    });

    const vehicleHistory = await get(
      `/api/v1/vehicles/${vehicle.id}/maintenance-history`,
      adminToken,
    );
    expect(vehicleHistory.history.items).toHaveLength(2);
    expect(vehicleHistory.history.items[0]).toEqual(
      expect.objectContaining({
        id: secondCard.id,
        customer: expect.objectContaining({ id: customerB.id }),
      }),
    );
    expect(vehicleHistory.history.items[1]).toEqual(
      expect.objectContaining({
        id: firstCard.id,
        customer: expect.objectContaining({ id: customerA.id }),
      }),
    );

    const historyA = await get(`/api/v1/customers/${customerA.id}/maintenance-history`, adminToken);
    const historyB = await get(`/api/v1/customers/${customerB.id}/maintenance-history`, adminToken);
    expect(historyA.history.items.map(({ id }: { id: string }) => id)).toContain(firstCard.id);
    expect(historyB.history.items.map(({ id }: { id: string }) => id)).toContain(secondCard.id);

    const search = await get(`/api/v1/search?q=${marker}`, adminToken);
    expect(search.customers).toHaveLength(2);
    expect(search.vehicles.map(({ id }: { id: string }) => id)).toContain(vehicle.id);
    const cardSearch = await get(
      `/api/v1/search?q=${encodeURIComponent(firstCard.cardNumber)}`,
      adminToken,
    );
    expect(cardSearch.maintenanceCards.map(({ id }: { id: string }) => id)).toContain(firstCard.id);

    await request(app.getHttpServer()).get('/api/v1/dashboard/stats').expect(401);
    const adminStats = await get('/api/v1/dashboard/stats', adminToken);
    const superAdminStats = await get('/api/v1/dashboard/stats', superAdminToken);
    const today = getUtcDayRange(new Date(), 'Asia/Amman');
    const [
      openCards,
      closedCards,
      todayReceived,
      totalCards,
      activeCustomers,
      totalCustomers,
      activeVehicles,
      totalVehicles,
    ] = await Promise.all([
      prisma.maintenanceCard.count({ where: { status: 'OPEN' } }),
      prisma.maintenanceCard.count({ where: { status: 'CLOSED' } }),
      prisma.maintenanceCard.count({
        where: { receivedAt: { gte: today.start, lt: today.endExclusive } },
      }),
      prisma.maintenanceCard.count(),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.customer.count(),
      prisma.vehicle.count({ where: { isActive: true } }),
      prisma.vehicle.count(),
    ]);
    const expectedStats = {
      maintenance: { openCards, closedCards, todayReceived, totalCards },
      customers: { active: activeCustomers, total: totalCustomers },
      vehicles: { active: activeVehicles, total: totalVehicles },
    };
    expect(adminStats).toEqual(expectedStats);
    expect(superAdminStats).toEqual(expectedStats);
  }, 30_000);

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return response.body.data.accessToken as string;
  }

  async function post(path: string, token: string, body: object): Promise<any> {
    const response = await request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect((result) => {
        if (result.status < 200 || result.status >= 300) throw new Error(result.text);
      });
    return response.body.data;
  }

  async function patch(path: string, token: string, body: object): Promise<any> {
    const response = await request(app.getHttpServer())
      .patch(path)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(200);
    return response.body.data;
  }

  async function get(path: string, token: string): Promise<any> {
    const response = await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return response.body.data;
  }
});
