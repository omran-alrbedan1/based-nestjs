import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  const prisma = {
    customer: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    maintenanceCard: { findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: CustomersService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    );
    service = new CustomersService(prisma as unknown as PrismaService);
  });

  it('creates a normalized customer DTO', async () => {
    const dto = { name: 'Ahmad', phone: '+96279', email: 'a@example.com' };
    prisma.customer.create.mockResolvedValue({ id: 'customer-1', ...dto });

    await service.create(dto);

    expect(prisma.customer.create).toHaveBeenCalledWith(expect.objectContaining({ data: dto }));
  });

  it('updates an existing customer', async () => {
    prisma.customer.findUnique.mockResolvedValue({ id: 'customer-1' });
    prisma.customer.update.mockResolvedValue({ id: 'customer-1', name: 'Updated' });

    await service.update('customer-1', { name: 'Updated' });

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'customer-1' },
        data: { name: 'Updated' },
      }),
    );
  });

  it('searches and paginates customers', async () => {
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.customer.count.mockResolvedValue(0);

    const result = await service.findAll({ search: 'Ahmad', page: 2, limit: 10 });

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }),
    );
    expect(result.meta).toMatchObject({ page: 2, limit: 10, total: 0 });
  });

  it('deactivates without touching ownership history', async () => {
    prisma.customer.findUnique.mockResolvedValue({ id: 'customer-1' });
    prisma.customer.update.mockResolvedValue({ id: 'customer-1', isActive: false });

    await service.deactivate('customer-1');

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });

  it('throws a translated not-found exception', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(AppException);
  });

  it('returns customer history using the immutable card customer', async () => {
    prisma.customer.findUnique.mockResolvedValue({ id: 'customer-1', name: 'Ahmad' });
    prisma.maintenanceCard.findMany.mockResolvedValue([]);
    prisma.maintenanceCard.count.mockResolvedValue(0);

    const result = await service.maintenanceHistory('customer-1', {
      vehicleId: '11111111-1111-4111-8111-111111111111',
      page: 1,
      limit: 10,
    });

    expect(prisma.maintenanceCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerId: 'customer-1',
          vehicleOwnership: { vehicleId: '11111111-1111-4111-8111-111111111111' },
        }),
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(result.history.meta.total).toBe(0);
  });
});
