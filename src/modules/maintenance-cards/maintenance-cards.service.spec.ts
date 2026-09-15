import {
  FuelLevel,
  MaintenanceCardStatus,
  MaintenanceWorkEventType,
  MaintenanceWorkStatus,
  Role,
} from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { MaintenanceCardValidator } from './maintenance-card.validator';
import { MaintenanceCardsService } from './maintenance-cards.service';
import { MaintenanceCardLifecycleService } from './maintenance-card-lifecycle.service';

describe('MaintenanceCardsService', () => {
  const tx = {
    maintenanceCard: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    maintenanceCardVisitReason: { createMany: jest.fn(), deleteMany: jest.fn() },
    maintenanceCardConditionOption: { createMany: jest.fn(), deleteMany: jest.fn() },
    maintenanceCardItemOption: { createMany: jest.fn(), deleteMany: jest.fn() },
    maintenanceCardRequiredWork: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    maintenanceWorkEvent: { createMany: jest.fn() },
    maintenanceCardStatusEvent: { create: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const prisma = {
    maintenanceCard: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const validator = {
    validateCreate: jest.fn(),
    validateUpdate: jest.fn(),
  };
  let service: MaintenanceCardsService;
  const createDto = {
    customerId: 'customer-1',
    vehicleOwnershipId: 'ownership-1',
    receivedAt: '2026-09-01T10:00:00.000Z',
    mileage: 100,
    fuelLevel: FuelLevel.HALF,
    customerApproved: false,
    requiredWorks: [{ description: '  Oil change  ', displayOrder: 0 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.maintenanceCard.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (client: typeof tx) => unknown)(tx)
        : Promise.all(arg as Promise<unknown>[]),
    );
    service = new MaintenanceCardsService(
      prisma as unknown as PrismaService,
      validator as unknown as MaintenanceCardValidator,
    );
  });

  it('creates a normalized card, ordered work, initial OPEN event, and CREATED work event', async () => {
    prisma.maintenanceCard.findUnique.mockResolvedValue(null);
    tx.maintenanceCard.create.mockResolvedValue({ id: 'card-1' });
    tx.maintenanceCard.findUniqueOrThrow.mockResolvedValue({
      id: 'card-1',
      visitReasons: [],
      conditionOptions: [],
      itemOptions: [],
    });
    tx.maintenanceCardRequiredWork.findMany.mockResolvedValue([
      { id: 'work-1', description: 'Oil change' },
    ]);
    tx.$queryRaw.mockResolvedValue([{ sequenceValue: BigInt(12) }]);

    await service.create(createDto, 'user-1');

    expect(tx.maintenanceCard.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cardNumber: `RP-${new Date().getUTCFullYear()}-000012` }),
      }),
    );
    expect(tx.maintenanceCardRequiredWork.createMany).toHaveBeenCalledWith({
      data: [
        {
          maintenanceCardId: 'card-1',
          description: 'Oil change',
          displayOrder: 0,
          isRequired: true,
          estimatedCost: undefined,
        },
      ],
    });
    expect(tx.maintenanceWorkEvent.createMany).toHaveBeenCalledWith({
      data: [
        {
          maintenanceCardId: 'card-1',
          requiredWorkId: 'work-1',
          eventType: MaintenanceWorkEventType.CREATED,
          fromStatus: null,
          toStatus: MaintenanceWorkStatus.PENDING,
          workDescriptionSnapshot: 'Oil change',
          changedByUserId: 'user-1',
        },
      ],
    });
    expect(tx.maintenanceCardStatusEvent.create).toHaveBeenCalledWith({
      data: {
        maintenanceCardId: 'card-1',
        fromStatus: null,
        toStatus: MaintenanceCardStatus.OPEN,
        changedByUserId: 'user-1',
      },
    });
  });

  it('lists cards using status and search filters', async () => {
    prisma.maintenanceCard.findMany.mockResolvedValue([]);
    prisma.maintenanceCard.count.mockResolvedValue(0);
    prisma.$transaction.mockResolvedValue([[], 0]);
    const result = await service.findAll({
      search: 'rp-10',
      status: MaintenanceCardStatus.OPEN,
      page: 1,
      limit: 10,
    });
    expect(result.meta.total).toBe(0);
    expect(prisma.maintenanceCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: MaintenanceCardStatus.OPEN }),
      }),
    );
  });

  it('returns complete details including inactive historical options', async () => {
    prisma.maintenanceCard.findUnique.mockResolvedValue({
      id: 'card-1',
      visitReasons: [{ visitReason: { id: 'option-1', isActive: false } }],
      conditionOptions: [],
      itemOptions: [],
    });
    const result = await service.findOne('card-1');
    expect(result.visitReasons[0].visitReason.isActive).toBe(false);
  });

  it('updates mutable fields on an OPEN card without replacing work lines', async () => {
    prisma.maintenanceCard.findUnique.mockResolvedValue({
      status: MaintenanceCardStatus.OPEN,
      receivedAt: new Date(),
      customerApproved: false,
      customerApprovalName: null,
      customerApprovedAt: null,
    });
    tx.maintenanceCard.updateMany.mockResolvedValue({ count: 1 });
    tx.maintenanceCard.findUniqueOrThrow.mockResolvedValue({
      id: 'card-1',
      visitReasons: [],
      conditionOptions: [],
      itemOptions: [],
    });

    await service.update('card-1', { inspectionNotes: 'Checked' });

    expect(tx.maintenanceCardRequiredWork.deleteMany).not.toHaveBeenCalled();
    expect(tx.maintenanceCardRequiredWork.createMany).not.toHaveBeenCalled();
  });

  it('rejects normal updates to CLOSED cards', async () => {
    prisma.maintenanceCard.findUnique.mockResolvedValue({
      status: MaintenanceCardStatus.CLOSED,
    });
    await expect(service.update('card-1', { mileage: 20 })).rejects.toBeInstanceOf(AppException);
  });
});

describe('MaintenanceCardLifecycleService', () => {
  const tx = {
    maintenanceCard: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    maintenanceCardRequiredWork: { count: jest.fn() },
    maintenanceCardStatusEvent: { create: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const prisma = {
    $transaction: jest.fn(),
  };
  let lifecycle: MaintenanceCardLifecycleService;

  beforeEach(() => {
    jest.clearAllMocks();
    tx.maintenanceCard.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation((fn: unknown) =>
      (fn as (client: typeof tx) => unknown)(tx),
    );
    lifecycle = new MaintenanceCardLifecycleService(prisma as unknown as PrismaService);
  });

  it('closes OPEN cards and writes the transition event', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue({ status: MaintenanceCardStatus.OPEN });
    tx.maintenanceCard.findUniqueOrThrow.mockResolvedValue({
      id: 'card-1',
      visitReasons: [],
      conditionOptions: [],
      itemOptions: [],
    });
    await lifecycle.close('card-1', 'admin-1');
    expect(tx.maintenanceCardStatusEvent.create).toHaveBeenCalledWith({
      data: {
        maintenanceCardId: 'card-1',
        fromStatus: MaintenanceCardStatus.OPEN,
        toStatus: MaintenanceCardStatus.CLOSED,
        changedByUserId: 'admin-1',
      },
    });
  });

  it('rejects closing an already CLOSED card', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue({ status: MaintenanceCardStatus.CLOSED });
    await expect(lifecycle.close('card-1', 'admin-1')).rejects.toBeInstanceOf(AppException);
  });

  it('blocks close while a required work item is non-terminal', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue({ status: MaintenanceCardStatus.OPEN });
    tx.maintenanceCardRequiredWork.count.mockResolvedValue(1);
    await expect(lifecycle.close('card-1', 'admin-1')).rejects.toBeInstanceOf(AppException);
    expect(tx.maintenanceCard.updateMany).not.toHaveBeenCalled();
  });

  it('reopens for SUPER_ADMIN and clears closure metadata', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue({ status: MaintenanceCardStatus.CLOSED });
    tx.maintenanceCard.findUniqueOrThrow.mockResolvedValue({
      id: 'card-1',
      visitReasons: [],
      conditionOptions: [],
      itemOptions: [],
    });
    await lifecycle.reopen('card-1', 'super-1', Role.SUPER_ADMIN);
    expect(tx.maintenanceCard.updateMany).toHaveBeenCalledWith({
      where: { id: 'card-1', status: MaintenanceCardStatus.CLOSED },
      data: { status: MaintenanceCardStatus.OPEN, closedAt: null, closedByUserId: null },
    });
  });

  it('rejects ADMIN reopen attempts', () => {
    expect(() => lifecycle.reopen('card-1', 'admin-1', Role.ADMIN)).toThrow(AppException);
  });
});
