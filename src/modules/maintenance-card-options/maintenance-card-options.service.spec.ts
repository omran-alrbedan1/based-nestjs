import { Role } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { MaintenanceCardOptionsService } from './maintenance-card-options.service';

describe('MaintenanceCardOptionsService', () => {
  const prisma = {
    visitReason: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vehicleConditionOption: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vehicleItemOption: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  let service: MaintenanceCardOptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MaintenanceCardOptionsService(prisma as unknown as PrismaService);
  });

  it('creates normalized options for SUPER_ADMIN', async () => {
    prisma.visitReason.create.mockResolvedValue({ id: 'option-1' });
    await service.create(
      'visitReason',
      { code: ' oil ', label: ' Oil change ', displayOrder: 0 },
      'super-1',
      Role.SUPER_ADMIN,
    );
    expect(prisma.visitReason.create).toHaveBeenCalledWith({
      data: {
        code: 'OIL',
        label: 'Oil change',
        displayOrder: 0,
        createdByUserId: 'super-1',
      },
    });
  });

  it('rejects ADMIN option management', async () => {
    await expect(
      service.create(
        'visitReason',
        { code: 'OIL', label: 'Oil', displayOrder: 0 },
        'admin-1',
        Role.ADMIN,
      ),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('deactivates an option', async () => {
    prisma.visitReason.findUnique.mockResolvedValue({
      id: 'option-1',
      _count: { cardUsages: 0 },
    });
    prisma.visitReason.update.mockResolvedValue({ id: 'option-1', isActive: false });
    await service.setActive('visitReason', 'option-1', false, Role.SUPER_ADMIN);
    expect(prisma.visitReason.update).toHaveBeenCalledWith({
      where: { id: 'option-1' },
      data: { isActive: false },
    });
  });

  it('prevents renaming a used option', async () => {
    prisma.visitReason.findUnique.mockResolvedValue({
      id: 'option-1',
      code: 'OLD',
      label: 'Old',
      _count: { cardUsages: 1 },
    });
    await expect(
      service.update('visitReason', 'option-1', { label: 'New' }, Role.SUPER_ADMIN),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('prevents deleting a used option', async () => {
    prisma.visitReason.findUnique.mockResolvedValue({
      id: 'option-1',
      _count: { cardUsages: 1 },
    });
    await expect(
      service.delete('visitReason', 'option-1', Role.SUPER_ADMIN),
    ).rejects.toBeInstanceOf(AppException);
    expect(prisma.visitReason.delete).not.toHaveBeenCalled();
  });
});
