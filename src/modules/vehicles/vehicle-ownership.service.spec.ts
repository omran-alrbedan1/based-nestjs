import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { VehicleOwnershipService } from './vehicle-ownership.service';

describe('VehicleOwnershipService', () => {
  const tx = {
    vehicle: { findUnique: jest.fn() },
    customer: { findUnique: jest.fn() },
    vehicleOwnership: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };
  const prisma = {
    vehicle: { findUnique: jest.fn() },
    vehicleOwnership: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: VehicleOwnershipService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    service = new VehicleOwnershipService(prisma as unknown as PrismaService);
  });

  it('returns current owner and immutable ownership history', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({ id: 'vehicle-1' });
    prisma.vehicleOwnership.findMany.mockResolvedValue([
      { id: 'ownership-2', endedAt: null },
      { id: 'ownership-1', endedAt: new Date() },
    ]);

    const result = await service.getOwnership('vehicle-1');

    expect(prisma.vehicleOwnership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vehicleId: 'vehicle-1' },
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(result.currentOwner.id).toBe('ownership-2');
    expect(result.history).toHaveLength(2);
  });

  it('rejects ownership history for a missing vehicle', async () => {
    prisma.vehicle.findUnique.mockResolvedValue(null);

    await expect(service.getOwnership('vehicle-1')).rejects.toBeInstanceOf(AppException);
    expect(prisma.vehicleOwnership.findMany).not.toHaveBeenCalled();
  });

  it('ends the old ownership and creates the new ownership atomically', async () => {
    tx.vehicle.findUnique.mockResolvedValue({ id: 'vehicle-1', isActive: true });
    tx.customer.findUnique.mockResolvedValue({ id: 'customer-2', isActive: true });
    tx.vehicleOwnership.findFirst.mockResolvedValue({
      id: 'ownership-1',
      customerId: 'customer-1',
    });
    tx.vehicleOwnership.updateMany.mockResolvedValue({ count: 1 });
    tx.vehicleOwnership.create.mockResolvedValue({ id: 'ownership-2' });

    await service.transferOwnership('vehicle-1', { customerId: 'customer-2' });

    const endedAt = tx.vehicleOwnership.updateMany.mock.calls[0][0].data.endedAt;
    const startedAt = tx.vehicleOwnership.create.mock.calls[0][0].data.startedAt;
    expect(endedAt).toBe(startedAt);
    expect(tx.vehicleOwnership.create).toHaveBeenCalled();
  });

  it('rejects transfer to the same current owner', async () => {
    tx.vehicle.findUnique.mockResolvedValue({ id: 'vehicle-1', isActive: true });
    tx.customer.findUnique.mockResolvedValue({ id: 'customer-1', isActive: true });
    tx.vehicleOwnership.findFirst.mockResolvedValue({
      id: 'ownership-1',
      customerId: 'customer-1',
    });

    await expect(
      service.transferOwnership('vehicle-1', { customerId: 'customer-1' }),
    ).rejects.toBeInstanceOf(AppException);
    expect(tx.vehicleOwnership.updateMany).not.toHaveBeenCalled();
  });

  it('rejects transfer to an inactive customer and rolls back before writes', async () => {
    tx.vehicle.findUnique.mockResolvedValue({ id: 'vehicle-1', isActive: true });
    tx.customer.findUnique.mockResolvedValue({ id: 'customer-2', isActive: false });

    await expect(
      service.transferOwnership('vehicle-1', { customerId: 'customer-2' }),
    ).rejects.toBeInstanceOf(AppException);
    expect(tx.vehicleOwnership.updateMany).not.toHaveBeenCalled();
    expect(tx.vehicleOwnership.create).not.toHaveBeenCalled();
  });

  it('propagates a failed ownership creation so the transaction can roll back', async () => {
    tx.vehicle.findUnique.mockResolvedValue({ id: 'vehicle-1', isActive: true });
    tx.customer.findUnique.mockResolvedValue({ id: 'customer-2', isActive: true });
    tx.vehicleOwnership.findFirst.mockResolvedValue({
      id: 'ownership-1',
      customerId: 'customer-1',
    });
    tx.vehicleOwnership.updateMany.mockResolvedValue({ count: 1 });
    tx.vehicleOwnership.create.mockRejectedValue(new Error('database rejected overlap'));

    await expect(
      service.transferOwnership('vehicle-1', { customerId: 'customer-2' }),
    ).rejects.toThrow('database rejected overlap');
  });
});
