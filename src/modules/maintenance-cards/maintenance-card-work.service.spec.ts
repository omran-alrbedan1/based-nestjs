import {
  MaintenanceCardStatus,
  MaintenanceWorkEventType,
  MaintenanceWorkStatus,
} from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { MaintenanceCardWorkService } from './maintenance-card-work.service';

describe('MaintenanceCardWorkService', () => {
  const now = new Date();
  const workState = {
    id: 10,
    status: MaintenanceWorkStatus.IN_PROGRESS,
    startedAt: now,
    startedBy: { id: 1, firstName: 'Admin', lastName: null },
    completedAt: null,
    completedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
  };
  const tx = {
    $queryRaw: jest.fn(),
    maintenanceCard: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
    maintenanceCardRequiredWork: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    maintenanceWorkEvent: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
  };
  let service: MaintenanceCardWorkService;

  const openCard = { status: MaintenanceCardStatus.OPEN };
  const closedCard = { status: MaintenanceCardStatus.CLOSED };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((fn: unknown) =>
      (fn as (client: typeof tx) => unknown)(tx),
    );
    service = new MaintenanceCardWorkService(prisma as unknown as PrismaService);
    tx.maintenanceCardRequiredWork.findUniqueOrThrow.mockResolvedValue(workState);
  });

  it('creates a work item and records a CREATED event', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.create.mockResolvedValue({
      id: 10,
      description: 'Oil change',
      displayOrder: 0,
      isRequired: true,
      estimatedCost: null,
    });

    const result = await service.createRequiredWork(
      1,
      {
        description: '  Oil change  ',
        displayOrder: 0,
      },
      1,
    );

    expect(result).toEqual(expect.objectContaining({ id: 10, description: 'Oil change' }));
    expect(tx.maintenanceWorkEvent.create).toHaveBeenCalledWith({
      data: {
        maintenanceCardId: 1,
        requiredWorkId: 10,
        eventType: MaintenanceWorkEventType.CREATED,
        fromStatus: null,
        toStatus: MaintenanceWorkStatus.PENDING,
        workDescriptionSnapshot: 'Oil change',
        changedByUserId: 1,
      },
    });
  });

  it('starts PENDING work and records a STARTED event', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      status: MaintenanceWorkStatus.PENDING,
      description: 'Oil change',
    });
    tx.maintenanceCardRequiredWork.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.startWork(1, 10, 1);

    expect(tx.maintenanceCardRequiredWork.updateMany).toHaveBeenCalledWith({
      where: { id: 10, maintenanceCardId: 1, status: MaintenanceWorkStatus.PENDING },
      data: {
        status: MaintenanceWorkStatus.IN_PROGRESS,
        startedAt: expect.any(Date),
        startedByUserId: 1,
      },
    });
    expect(tx.maintenanceWorkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: MaintenanceWorkEventType.STARTED,
          fromStatus: MaintenanceWorkStatus.PENDING,
          toStatus: MaintenanceWorkStatus.IN_PROGRESS,
          changedByUserId: 1,
        }),
      }),
    );
    expect(result.status).toBe(MaintenanceWorkStatus.IN_PROGRESS);
  });

  it('completes IN_PROGRESS work and records a COMPLETED event', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      status: MaintenanceWorkStatus.IN_PROGRESS,
      description: 'Oil change',
    });
    tx.maintenanceCardRequiredWork.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.completeWork(1, 10, 1);

    expect(tx.maintenanceCardRequiredWork.updateMany).toHaveBeenCalledWith({
      where: { id: 10, maintenanceCardId: 1, status: MaintenanceWorkStatus.IN_PROGRESS },
      data: {
        status: MaintenanceWorkStatus.COMPLETED,
        completedAt: expect.any(Date),
        completedByUserId: 1,
      },
    });
    expect(tx.maintenanceWorkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: MaintenanceWorkEventType.COMPLETED }),
      }),
    );
    expect(result.status).toBe(MaintenanceWorkStatus.IN_PROGRESS);
  });

  it('requires a reason to cancel', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      status: MaintenanceWorkStatus.PENDING,
      description: 'Oil change',
    });

    await expect(service.cancelWork(1, 10, '   ', 1)).rejects.toMatchObject({
      response: expect.objectContaining({
        key: 'maintenanceCards.errors.work_cancel_reason_required',
      }),
    });
    expect(tx.maintenanceCardRequiredWork.updateMany).not.toHaveBeenCalled();
  });

  it('cancels work with the supplied reason', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      status: MaintenanceWorkStatus.IN_PROGRESS,
      description: 'Oil change',
    });
    tx.maintenanceCardRequiredWork.updateMany.mockResolvedValue({ count: 1 });

    await service.cancelWork(1, 10, 'Not needed anymore', 1);

    expect(tx.maintenanceCardRequiredWork.updateMany).toHaveBeenCalledWith({
      where: { id: 10, maintenanceCardId: 1, status: MaintenanceWorkStatus.IN_PROGRESS },
      data: {
        status: MaintenanceWorkStatus.CANCELLED,
        cancelledAt: expect.any(Date),
        cancelledByUserId: 1,
        cancellationReason: 'Not needed anymore',
      },
    });
    expect(tx.maintenanceWorkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: MaintenanceWorkEventType.CANCELLED,
          reason: 'Not needed anymore',
        }),
      }),
    );
  });

  it('requires a reason to reopen', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      status: MaintenanceWorkStatus.COMPLETED,
      description: 'Oil change',
    });

    await expect(service.reopenWork(1, 10, '', 1)).rejects.toMatchObject({
      response: expect.objectContaining({
        key: 'maintenanceCards.errors.work_reopen_reason_required',
      }),
    });
  });

  it('reopens COMPLETED work to PENDING and clears completion metadata', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      status: MaintenanceWorkStatus.COMPLETED,
      description: 'Oil change',
    });
    tx.maintenanceCardRequiredWork.updateMany.mockResolvedValue({ count: 1 });

    await service.reopenWork(1, 10, 'Restarted', 1);

    expect(tx.maintenanceCardRequiredWork.updateMany).toHaveBeenCalledWith({
      where: { id: 10, maintenanceCardId: 1, status: MaintenanceWorkStatus.COMPLETED },
      data: {
        status: MaintenanceWorkStatus.PENDING,
        completedAt: null,
        completedByUserId: null,
        startedAt: null,
        startedByUserId: null,
        cancelledAt: null,
        cancelledByUserId: null,
        cancellationReason: null,
      },
    });
    expect(tx.maintenanceWorkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: MaintenanceWorkEventType.REOPENED }),
      }),
    );
  });

  it('reopens COMPLETED work directly to IN_PROGRESS when requested', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      status: MaintenanceWorkStatus.COMPLETED,
      description: 'Oil change',
    });
    tx.maintenanceCardRequiredWork.updateMany.mockResolvedValue({ count: 1 });

    await service.reopenWork(1, 10, 'Back in flow', 1, MaintenanceWorkStatus.IN_PROGRESS);

    expect(tx.maintenanceCardRequiredWork.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: MaintenanceWorkStatus.IN_PROGRESS,
          startedAt: expect.any(Date),
          startedByUserId: 1,
        }),
      }),
    );
  });

  it('rejects invalid transitions', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      status: MaintenanceWorkStatus.COMPLETED,
      description: 'Oil change',
    });

    await expect(service.startWork(1, 10, 1)).rejects.toMatchObject({
      response: expect.objectContaining({
        key: 'maintenanceCards.errors.work_transition_not_allowed',
      }),
    });
    expect(tx.maintenanceCardRequiredWork.updateMany).not.toHaveBeenCalled();
  });

  it('is idempotent against a repeated start', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      status: MaintenanceWorkStatus.IN_PROGRESS,
      description: 'Oil change',
    });

    await service.startWork(1, 10, 1);

    expect(tx.maintenanceCardRequiredWork.updateMany).not.toHaveBeenCalled();
    expect(tx.maintenanceWorkEvent.create).not.toHaveBeenCalled();
  });

  it('blocks all transitions on CLOSED cards', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(closedCard);

    await expect(service.startWork(1, 10, 1)).rejects.toMatchObject({
      response: expect.objectContaining({ key: 'maintenanceCards.errors.closed_read_only' }),
    });
  });

  it('rejects work that does not belong to the card', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue(null);

    await expect(service.completeWork(1, 99, 1)).rejects.toMatchObject({
      response: expect.objectContaining({ key: 'maintenanceCards.errors.work_not_found' }),
    });
  });

  it('guards against concurrent transitions', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      status: MaintenanceWorkStatus.PENDING,
      description: 'Oil change',
    });
    tx.maintenanceCardRequiredWork.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.startWork(1, 10, 1)).rejects.toMatchObject({
      response: expect.objectContaining({
        key: 'maintenanceCards.errors.work_transition_conflict',
      }),
    });
    expect(tx.maintenanceWorkEvent.create).not.toHaveBeenCalled();
  });

  it('updates work data and records an UPDATED event without touching status', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      description: 'Old description',
      status: MaintenanceWorkStatus.PENDING,
    });
    tx.maintenanceCardRequiredWork.findUniqueOrThrow.mockResolvedValue({
      ...workState,
      description: 'Old description',
      status: MaintenanceWorkStatus.PENDING,
    });

    await service.updateRequiredWork(1, 10, { description: '  New description  ' }, 1);

    expect(tx.maintenanceCardRequiredWork.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { description: 'New description' },
    });
    expect(tx.maintenanceWorkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: MaintenanceWorkEventType.UPDATED,
          workDescriptionSnapshot: 'New description',
          fromStatus: MaintenanceWorkStatus.PENDING,
          toStatus: MaintenanceWorkStatus.PENDING,
        }),
      }),
    );
  });

  it('deletes never-started PENDING work and records a REMOVED event', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      description: 'Oil change',
      status: MaintenanceWorkStatus.PENDING,
      startedAt: null,
    });

    const result = await service.deleteRequiredWork(1, 10, 1);

    expect(tx.maintenanceCardRequiredWork.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(tx.maintenanceWorkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: MaintenanceWorkEventType.REMOVED,
          fromStatus: MaintenanceWorkStatus.PENDING,
          toStatus: null,
          workDescriptionSnapshot: 'Oil change',
        }),
      }),
    );
    expect(result).toEqual({ id: 10 });
  });

  it('refuses to delete work that was already started', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      description: 'Oil change',
      status: MaintenanceWorkStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    await expect(service.deleteRequiredWork(1, 10, 1)).rejects.toMatchObject({
      response: expect.objectContaining({ key: 'maintenanceCards.errors.work_not_removable' }),
    });
    expect(tx.maintenanceCardRequiredWork.delete).not.toHaveBeenCalled();
  });

  it('routes the deprecated status PATCH through the transition engine', async () => {
    tx.maintenanceCard.findUnique.mockResolvedValue(openCard);
    tx.maintenanceCardRequiredWork.findFirst.mockResolvedValue({
      id: 10,
      description: 'Oil change',
      status: MaintenanceWorkStatus.PENDING,
    });
    tx.maintenanceCardRequiredWork.updateMany.mockResolvedValue({ count: 1 });

    await service.updateRequiredWork(1, 10, { status: MaintenanceWorkStatus.IN_PROGRESS }, 1);

    expect(tx.maintenanceCardRequiredWork.updateMany).toHaveBeenCalledWith({
      where: { id: 10, maintenanceCardId: 1, status: MaintenanceWorkStatus.PENDING },
      data: {
        status: MaintenanceWorkStatus.IN_PROGRESS,
        startedAt: expect.any(Date),
        startedByUserId: 1,
      },
    });
    expect(tx.maintenanceWorkEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: MaintenanceWorkEventType.STARTED }),
      }),
    );
  });
});
