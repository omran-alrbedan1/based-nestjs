import { TransmissionType } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { VehiclesService } from './vehicles.service';

describe('VehiclesService', () => {
  const tx = {
    vehicle: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    customer: { findUnique: jest.fn() },
    vehicleOwnership: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    customer: { findUnique: jest.fn() },
    vehicle: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    vehicleOwnership: { findMany: jest.fn() },
    maintenanceCard: { findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: VehiclesService;

  const createDto = {
    customerId: '11111111-1111-4111-8111-111111111111',
    make: 'Toyota',
    model: 'Corolla',
    manufactureYear: 2022,
    plateNumber: '12-34567',
    vin: 'JTDBR32E720123456',
    transmission: TransmissionType.AUTOMATIC,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    prisma.customer.findUnique.mockResolvedValue({ id: createDto.customerId, isActive: true });
    prisma.vehicle.findFirst.mockResolvedValue(null);
    service = new VehiclesService(prisma as unknown as PrismaService);
  });

  it('creates a vehicle and initial ownership transactionally', async () => {
    tx.vehicle.create.mockResolvedValue({ id: 'vehicle-1', ...createDto });
    tx.vehicleOwnership.create.mockResolvedValue({
      id: 'ownership-1',
      customerId: createDto.customerId,
    });

    const result = await service.create(createDto);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.vehicleOwnership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vehicleId: 'vehicle-1',
          customerId: createDto.customerId,
          startedAt: expect.any(Date),
        }),
      }),
    );
    expect(result.currentOwnership.id).toBe('ownership-1');
  });

  it('rejects a duplicate active normalized plate', async () => {
    prisma.vehicle.findFirst.mockResolvedValueOnce({ id: 'duplicate' });

    await expect(service.create(createDto)).rejects.toBeInstanceOf(AppException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a duplicate VIN', async () => {
    prisma.vehicle.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'duplicate-vin' });

    await expect(service.create(createDto)).rejects.toBeInstanceOf(AppException);
  });

  it('updates normalized vehicle values supplied by the DTO layer', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({
      id: 'vehicle-1',
      plateNumber: 'OLD',
      vin: null,
      isActive: true,
    });
    prisma.vehicle.update.mockResolvedValue({ id: 'vehicle-1', plateNumber: 'NEW' });

    await service.update('vehicle-1', { plateNumber: '  new  ' });

    expect(prisma.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { plateNumber: 'NEW' } }),
    );
  });

  it('deactivates a vehicle without ending ownership', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({ id: 'vehicle-1', plateNumber: 'PLATE' });
    prisma.vehicle.update.mockResolvedValue({ id: 'vehicle-1', isActive: false });

    await service.deactivate('vehicle-1');

    expect(prisma.vehicle.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
    expect(tx.vehicleOwnership.updateMany).not.toHaveBeenCalled();
  });

  it('returns vehicle history across every ownership record', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({
      id: 'vehicle-1',
      make: 'Toyota',
      ownerships: [{ id: 'ownership-2', customer: { id: 'customer-2' } }],
    });
    prisma.maintenanceCard.findMany.mockResolvedValue([]);
    prisma.maintenanceCard.count.mockResolvedValue(0);
    prisma.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );

    const result = await service.maintenanceHistory('vehicle-1', { page: 1, limit: 10 });

    expect(prisma.maintenanceCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vehicleOwnership: { vehicleId: 'vehicle-1' } },
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(result.currentOwner.id).toBe('ownership-2');
  });
});
