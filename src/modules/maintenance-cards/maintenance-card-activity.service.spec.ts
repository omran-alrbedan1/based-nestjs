import { MaintenanceCardStatus, MaintenanceWorkEventType } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { MaintenanceCardActivityService } from './maintenance-card-activity.service';
import { toCardActivityItem, toWorkActivityItem } from './maintenance-card-activity.mapper';

describe('MaintenanceCardActivityService', () => {
  const prisma = {
    maintenanceCard: { findUnique: jest.fn() },
    maintenanceCardStatusEvent: { findMany: jest.fn() },
    maintenanceWorkEvent: { findMany: jest.fn() },
  };
  let service: MaintenanceCardActivityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MaintenanceCardActivityService(prisma as unknown as PrismaService);
  });

  const actor = { id: 1, firstName: 'Admin', lastName: null, email: 'admin@gmail.com' };

  it('throws 404 for an unknown card', async () => {
    prisma.maintenanceCard.findUnique.mockResolvedValue(null);
    await expect(service.getActivity(999, {})).rejects.toMatchObject({
      response: expect.objectContaining({ key: 'maintenanceCards.errors.not_found' }),
    });
  });

  it('merges card and work events newest-first and paginates after the merge', async () => {
    prisma.maintenanceCard.findUnique.mockResolvedValue({ id: 5 });
    const created = new Date('2026-09-01T10:00:00.000Z');
    const started = new Date('2026-09-02T10:00:00.000Z');
    const workRow1 = {
      id: 2,
      requiredWorkId: 10,
      eventType: MaintenanceWorkEventType.STARTED,
      fromStatus: 'PENDING',
      toStatus: 'IN_PROGRESS',
      workDescriptionSnapshot: 'Oil change',
      reason: null,
      createdAt: created,
      changedBy: actor,
    };
    const workRow2 = {
      id: 4,
      requiredWorkId: 11,
      eventType: MaintenanceWorkEventType.CREATED,
      fromStatus: 'PENDING',
      toStatus: 'PENDING',
      workDescriptionSnapshot: 'Filter',
      reason: null,
      createdAt: new Date('2026-09-03T10:00:00.000Z'),
      changedBy: actor,
    };
    prisma.maintenanceCardStatusEvent.findMany.mockResolvedValue([
      {
        id: 1,
        fromStatus: null,
        toStatus: MaintenanceCardStatus.OPEN,
        createdAt: created,
        changedBy: actor,
      },
      {
        id: 3,
        fromStatus: null,
        toStatus: MaintenanceCardStatus.OPEN,
        createdAt: started,
        changedBy: actor,
      },
    ]);
    prisma.maintenanceWorkEvent.findMany.mockResolvedValue([workRow1, workRow2]);

    const result = await service.getActivity(5, { page: 1, limit: 10 });

    expect(result.meta.total).toBe(4);
    expect(result.items).toEqual([
      toWorkActivityItem(workRow2),
      toCardActivityItem({
        id: 3,
        fromStatus: null,
        toStatus: MaintenanceCardStatus.OPEN,
        createdAt: started,
        changedBy: actor,
      }),
      toCardActivityItem({
        id: 1,
        fromStatus: null,
        toStatus: MaintenanceCardStatus.OPEN,
        createdAt: created,
        changedBy: actor,
      }),
      toWorkActivityItem(workRow1),
    ]);
  });

  it('paginates the merged timeline with index pagination', async () => {
    prisma.maintenanceCard.findUnique.mockResolvedValue({ id: 5 });
    const rows = [1, 2, 3, 4, 5].map((id) => ({
      id,
      requiredWorkId: id,
      eventType: MaintenanceWorkEventType.CREATED,
      fromStatus: 'PENDING',
      toStatus: 'PENDING',
      workDescriptionSnapshot: `Work ${id}`,
      reason: null,
      createdAt: new Date(`2026-09-0${id}T10:00:00.000Z`),
      changedBy: actor,
    }));
    prisma.maintenanceCardStatusEvent.findMany.mockResolvedValue([]);
    prisma.maintenanceWorkEvent.findMany.mockResolvedValue(rows);

    const result = await service.getActivity(5, { page: 2, limit: 2 });

    expect(result.meta.total).toBe(5);
    expect(result.meta.page).toBe(2);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.hasNextPage).toBe(true);
    expect(result.meta.hasPreviousPage).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('work-event-3');
    expect(result.items[1].id).toBe('work-event-2');
  });
});
