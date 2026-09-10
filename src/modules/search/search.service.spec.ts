import { PrismaService } from 'src/prisma/prisma.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  const prisma = {
    customer: { findMany: jest.fn() },
    vehicle: { findMany: jest.fn() },
    maintenanceCard: { findMany: jest.fn() },
  };
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.vehicle.findMany.mockResolvedValue([]);
    prisma.maintenanceCard.findMany.mockResolvedValue([]);
    service = new SearchService(prisma as unknown as PrismaService);
  });

  it('trims text and normalizes vehicle/card identifiers', async () => {
    await service.search('  rp-10  ');

    expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
    expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ plateNumber: { contains: 'RP-10', mode: 'insensitive' } }]),
        }),
      }),
    );
    expect(prisma.maintenanceCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        where: { cardNumber: { contains: 'RP-10', mode: 'insensitive' } },
      }),
    );
  });

  it('maps a vehicle current owner without exposing ownership rows', async () => {
    prisma.vehicle.findMany.mockResolvedValue([
      { id: 'vehicle-1', ownerships: [{ customer: { id: 'customer-1', name: 'Ahmad' } }] },
    ]);

    const result = await service.search('Toyota');

    expect(result.vehicles[0]).toEqual({
      id: 'vehicle-1',
      currentOwner: { id: 'customer-1', name: 'Ahmad' },
    });
  });
});
