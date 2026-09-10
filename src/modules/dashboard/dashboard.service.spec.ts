import { MaintenanceCardStatus } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    maintenanceCard: { groupBy: jest.fn(), count: jest.fn() },
    customer: { groupBy: jest.fn() },
    vehicle: { groupBy: jest.fn() },
  };
  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(prisma as unknown as PrismaService);
  });

  it('maps actual grouped database counts into the stable contract', async () => {
    prisma.maintenanceCard.groupBy.mockResolvedValue([
      { status: MaintenanceCardStatus.OPEN, _count: { _all: 5 } },
      { status: MaintenanceCardStatus.CLOSED, _count: { _all: 42 } },
    ]);
    prisma.maintenanceCard.count.mockResolvedValue(12);
    prisma.customer.groupBy.mockResolvedValue([
      { isActive: true, _count: { _all: 120 } },
      { isActive: false, _count: { _all: 15 } },
    ]);
    prisma.vehicle.groupBy.mockResolvedValue([
      { isActive: true, _count: { _all: 176 } },
      { isActive: false, _count: { _all: 12 } },
    ]);

    const result = await service.getStats(new Date('2026-09-04T12:00:00.000Z'));

    expect(result).toEqual({
      maintenance: { openCards: 5, closedCards: 42, todayReceived: 12, totalCards: 47 },
      customers: { active: 120, total: 135 },
      vehicles: { active: 176, total: 188 },
    });
    expect(prisma.maintenanceCard.count).toHaveBeenCalledWith({
      where: {
        receivedAt: {
          gte: new Date('2026-09-03T21:00:00.000Z'),
          lt: new Date('2026-09-04T21:00:00.000Z'),
        },
      },
    });
  });

  it('returns numeric zeros for an empty database', async () => {
    prisma.maintenanceCard.groupBy.mockResolvedValue([]);
    prisma.maintenanceCard.count.mockResolvedValue(0);
    prisma.customer.groupBy.mockResolvedValue([]);
    prisma.vehicle.groupBy.mockResolvedValue([]);

    await expect(service.getStats()).resolves.toEqual({
      maintenance: { openCards: 0, closedCards: 0, todayReceived: 0, totalCards: 0 },
      customers: { active: 0, total: 0 },
      vehicles: { active: 0, total: 0 },
    });
  });
});
