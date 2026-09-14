import { Role } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { MaintenanceCardOptionsRepository } from './maintenance-card-options.repository';
import { MaintenanceCardOptionsService } from './maintenance-card-options.service';

describe('MaintenanceCardOptionsService', () => {
  const repository = {
    findMany: jest.fn(),
    count: jest.fn(),
    findWithUsage: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  let service: MaintenanceCardOptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MaintenanceCardOptionsService(
      repository as unknown as MaintenanceCardOptionsRepository,
    );
  });

  it('creates normalized bilingual options for SUPER_ADMIN', async () => {
    repository.create.mockResolvedValue({ id: 'option-1' });
    await service.create(
      'visitReason',
      { code: ' oil ', labelEn: ' Oil change ', labelAr: 'تغيير الزيت', displayOrder: 0 },
      'super-1',
      Role.SUPER_ADMIN,
    );
    expect(repository.create).toHaveBeenCalledWith('visitReason', {
      code: 'OIL',
      labelEn: 'Oil change',
      labelAr: 'تغيير الزيت',
      displayOrder: 0,
      createdByUserId: 'super-1',
    });
  });

  it('rejects ADMIN option management', async () => {
    await expect(
      service.create(
        'visitReason',
        { code: 'OIL', labelEn: 'Oil', labelAr: 'زيت', displayOrder: 0 },
        'admin-1',
        Role.ADMIN,
      ),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('deactivates an option', async () => {
    repository.findWithUsage.mockResolvedValue({
      id: 'option-1',
      _count: { cardUsages: 0 },
    });
    repository.update.mockResolvedValue({ id: 'option-1', isActive: false });
    await service.setActive('visitReason', 'option-1', false, Role.SUPER_ADMIN);
    expect(repository.update).toHaveBeenCalledWith('visitReason', 'option-1', {
      isActive: false,
    });
  });

  it('prevents renaming a used option', async () => {
    repository.findWithUsage.mockResolvedValue({
      id: 'option-1',
      code: 'OLD',
      labelEn: 'Old',
      labelAr: 'قديم',
      _count: { cardUsages: 1 },
    });
    await expect(
      service.update(
        'visitReason',
        'option-1',
        { labelEn: 'New', labelAr: 'جديد' },
        Role.SUPER_ADMIN,
      ),
    ).rejects.toBeInstanceOf(AppException);
    repository.update.mockResolvedValue({ id: 'option-1' });
    await expect(
      service.update('visitReason', 'option-1', { displayOrder: 2 }, Role.SUPER_ADMIN),
    ).resolves.not.toThrow();
  });

  it('prevents deleting a used option', async () => {
    repository.findWithUsage.mockResolvedValue({
      id: 'option-1',
      _count: { cardUsages: 1 },
    });
    await expect(
      service.delete('visitReason', 'option-1', Role.SUPER_ADMIN),
    ).rejects.toBeInstanceOf(AppException);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('lists localized options filtered by search and isActive', async () => {
    const rows = [
      {
        id: 1,
        code: 'OIL',
        labelEn: 'Oil change',
        labelAr: 'تغيير الزيت',
        displayOrder: 0,
        isActive: true,
      },
    ];
    repository.findMany.mockResolvedValue(rows);
    repository.count.mockResolvedValue(1);

    const result = await service.list('visitReason', {
      search: 'oil',
      isActive: true,
      page: 1,
      limit: 10,
    });

    const where = {
      isActive: true,
      OR: [
        { code: { contains: 'oil', mode: 'insensitive' } },
        { labelEn: { contains: 'oil', mode: 'insensitive' } },
        { labelAr: { contains: 'oil', mode: 'insensitive' } },
      ],
    };
    expect(repository.findMany).toHaveBeenCalledWith(
      'visitReason',
      expect.objectContaining({ where, skip: 0, take: 10 }),
    );
    expect(repository.count).toHaveBeenCalledWith('visitReason', where);
    expect(result.meta.total).toBe(1);
    expect(result.items[0]).toEqual({
      id: 1,
      code: 'OIL',
      label: 'Oil change',
      displayOrder: 0,
      isActive: true,
    });
  });

  it('paginates option lists and honors skip/take', async () => {
    repository.findMany.mockResolvedValue([]);
    repository.count.mockResolvedValue(0);

    const result = await service.list('visitReason', { page: 2, limit: 5 });

    expect(repository.findMany).toHaveBeenCalledWith(
      'visitReason',
      expect.objectContaining({ skip: 5, take: 5 }),
    );
    expect(result.meta.page).toBe(2);
    expect(result.meta.limit).toBe(5);
  });

  describe('isActive filter', () => {
    it('returns only active records when isActive=true (visit-reasons)', async () => {
      const rows = [
        { id: 1, code: 'A', labelEn: 'A', labelAr: 'أ', displayOrder: 0, isActive: true },
        { id: 2, code: 'B', labelEn: 'B', labelAr: 'ب', displayOrder: 1, isActive: true },
      ];
      repository.findMany.mockResolvedValue(rows);
      repository.count.mockResolvedValue(2);

      const result = await service.list('visitReason', { isActive: true, page: 1, limit: 10 });

      expect(repository.findMany).toHaveBeenCalledWith(
        'visitReason',
        expect.objectContaining({ where: { isActive: true } }),
      );
      expect(repository.count).toHaveBeenCalledWith('visitReason', { isActive: true });
      expect(result.meta.total).toBe(2);
      expect(result.items.every((item: { isActive: boolean }) => item.isActive === true)).toBe(
        true,
      );
    });

    it('returns only inactive records when isActive=false (visit-reasons)', async () => {
      const rows = [
        { id: 3, code: 'C', labelEn: 'C', labelAr: 'ج', displayOrder: 2, isActive: false },
      ];
      repository.findMany.mockResolvedValue(rows);
      repository.count.mockResolvedValue(1);

      const result = await service.list('visitReason', { isActive: false, page: 1, limit: 10 });

      expect(repository.findMany).toHaveBeenCalledWith(
        'visitReason',
        expect.objectContaining({ where: { isActive: false } }),
      );
      expect(repository.count).toHaveBeenCalledWith('visitReason', { isActive: false });
      expect(result.meta.total).toBe(1);
      expect(result.items.every((item: { isActive: boolean }) => item.isActive === false)).toBe(
        true,
      );
    });

    it('returns all records when no isActive filter is provided (visit-reasons)', async () => {
      const rows = [
        { id: 1, code: 'A', labelEn: 'A', labelAr: 'أ', displayOrder: 0, isActive: true },
        { id: 3, code: 'C', labelEn: 'C', labelAr: 'ج', displayOrder: 2, isActive: false },
      ];
      repository.findMany.mockResolvedValue(rows);
      repository.count.mockResolvedValue(2);

      const result = await service.list('visitReason', { page: 1, limit: 10 });

      expect(repository.findMany).toHaveBeenCalledWith(
        'visitReason',
        expect.objectContaining({ where: {} }),
      );
      expect(repository.count).toHaveBeenCalledWith('visitReason', {});
      expect(result.meta.total).toBe(2);
    });

    it('returns only active records when isActive=true (vehicle-conditions)', async () => {
      const rows = [
        { id: 1, code: 'GOOD', labelEn: 'Good', labelAr: 'جيد', displayOrder: 0, isActive: true },
      ];
      repository.findMany.mockResolvedValue(rows);
      repository.count.mockResolvedValue(1);

      const result = await service.list('vehicleCondition', { isActive: true, page: 1, limit: 10 });

      expect(repository.findMany).toHaveBeenCalledWith(
        'vehicleCondition',
        expect.objectContaining({ where: { isActive: true } }),
      );
      expect(repository.count).toHaveBeenCalledWith('vehicleCondition', { isActive: true });
      expect(result.items.every((item: { isActive: boolean }) => item.isActive === true)).toBe(
        true,
      );
    });

    it('returns only inactive records when isActive=false (vehicle-conditions)', async () => {
      const rows = [
        { id: 2, code: 'BAD', labelEn: 'Bad', labelAr: 'سيئ', displayOrder: 1, isActive: false },
      ];
      repository.findMany.mockResolvedValue(rows);
      repository.count.mockResolvedValue(1);

      const result = await service.list('vehicleCondition', {
        isActive: false,
        page: 1,
        limit: 10,
      });

      expect(repository.findMany).toHaveBeenCalledWith(
        'vehicleCondition',
        expect.objectContaining({ where: { isActive: false } }),
      );
      expect(repository.count).toHaveBeenCalledWith('vehicleCondition', { isActive: false });
      expect(result.items.every((item: { isActive: boolean }) => item.isActive === false)).toBe(
        true,
      );
    });

    it('returns all records when no isActive filter is provided (vehicle-conditions)', async () => {
      const rows = [
        { id: 1, code: 'GOOD', labelEn: 'Good', labelAr: 'جيد', displayOrder: 0, isActive: true },
        { id: 2, code: 'BAD', labelEn: 'Bad', labelAr: 'سيئ', displayOrder: 1, isActive: false },
      ];
      repository.findMany.mockResolvedValue(rows);
      repository.count.mockResolvedValue(2);

      const result = await service.list('vehicleCondition', { page: 1, limit: 10 });

      expect(repository.findMany).toHaveBeenCalledWith(
        'vehicleCondition',
        expect.objectContaining({ where: {} }),
      );
      expect(repository.count).toHaveBeenCalledWith('vehicleCondition', {});
      expect(result.meta.total).toBe(2);
    });

    it('returns only active records when isActive=true (vehicle-items)', async () => {
      const rows = [
        { id: 1, code: 'TIRE', labelEn: 'Tire', labelAr: 'إطار', displayOrder: 0, isActive: true },
      ];
      repository.findMany.mockResolvedValue(rows);
      repository.count.mockResolvedValue(1);

      const result = await service.list('vehicleItem', { isActive: true, page: 1, limit: 10 });

      expect(repository.findMany).toHaveBeenCalledWith(
        'vehicleItem',
        expect.objectContaining({ where: { isActive: true } }),
      );
      expect(repository.count).toHaveBeenCalledWith('vehicleItem', { isActive: true });
      expect(result.items.every((item: { isActive: boolean }) => item.isActive === true)).toBe(
        true,
      );
    });

    it('returns only inactive records when isActive=false (vehicle-items)', async () => {
      const rows = [
        {
          id: 2,
          code: 'BRAKE',
          labelEn: 'Brake',
          labelAr: 'فرامل',
          displayOrder: 1,
          isActive: false,
        },
      ];
      repository.findMany.mockResolvedValue(rows);
      repository.count.mockResolvedValue(1);

      const result = await service.list('vehicleItem', { isActive: false, page: 1, limit: 10 });

      expect(repository.findMany).toHaveBeenCalledWith(
        'vehicleItem',
        expect.objectContaining({ where: { isActive: false } }),
      );
      expect(repository.count).toHaveBeenCalledWith('vehicleItem', { isActive: false });
      expect(result.items.every((item: { isActive: boolean }) => item.isActive === false)).toBe(
        true,
      );
    });

    it('returns all records when no isActive filter is provided (vehicle-items)', async () => {
      const rows = [
        { id: 1, code: 'TIRE', labelEn: 'Tire', labelAr: 'إطار', displayOrder: 0, isActive: true },
        {
          id: 2,
          code: 'BRAKE',
          labelEn: 'Brake',
          labelAr: 'فرامل',
          displayOrder: 1,
          isActive: false,
        },
      ];
      repository.findMany.mockResolvedValue(rows);
      repository.count.mockResolvedValue(2);

      const result = await service.list('vehicleItem', { page: 1, limit: 10 });

      expect(repository.findMany).toHaveBeenCalledWith(
        'vehicleItem',
        expect.objectContaining({ where: {} }),
      );
      expect(repository.count).toHaveBeenCalledWith('vehicleItem', {});
      expect(result.meta.total).toBe(2);
    });

    it('returns all records when isActive is an invalid value (visit-reasons)', async () => {
      const rows = [
        { id: 1, code: 'A', labelEn: 'A', labelAr: 'أ', displayOrder: 0, isActive: true },
        { id: 3, code: 'C', labelEn: 'C', labelAr: 'ج', displayOrder: 2, isActive: false },
      ];
      repository.findMany.mockResolvedValue(rows);
      repository.count.mockResolvedValue(2);

      const result = await service.list('visitReason', {
        isActive: 'garbage',
        page: 1,
        limit: 10,
      });

      expect(repository.findMany).toHaveBeenCalledWith(
        'visitReason',
        expect.objectContaining({ where: {} }),
      );
      expect(result.meta.total).toBe(2);
    });
  });
});
