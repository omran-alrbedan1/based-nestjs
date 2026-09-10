import { FuelLevel } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { MaintenanceCardValidator } from './maintenance-card.validator';

describe('MaintenanceCardValidator', () => {
  const prisma = {
    vehicleOwnership: { findUnique: jest.fn() },
    visitReason: { count: jest.fn() },
    vehicleConditionOption: { count: jest.fn() },
    vehicleItemOption: { count: jest.fn() },
  };
  let validator: MaintenanceCardValidator;
  const base = {
    customerId: 'customer-1',
    vehicleOwnershipId: 'ownership-1',
    receivedAt: '2026-09-01T10:00:00.000Z',
    mileage: 10,
    fuelLevel: FuelLevel.HALF,
    customerApproved: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new MaintenanceCardValidator(prisma as unknown as PrismaService);
    prisma.vehicleOwnership.findUnique.mockResolvedValue({
      customerId: 'customer-1',
      endedAt: null,
      customer: { isActive: true },
      vehicle: { isActive: true },
    });
    prisma.visitReason.count.mockResolvedValue(0);
    prisma.vehicleConditionOption.count.mockResolvedValue(0);
    prisma.vehicleItemOption.count.mockResolvedValue(0);
  });

  it('rejects ownership/customer mismatch', async () => {
    prisma.vehicleOwnership.findUnique.mockResolvedValue({
      customerId: 'other',
      endedAt: null,
      customer: { isActive: true },
      vehicle: { isActive: true },
    });
    await expect(validator.validateCreate(base)).rejects.toBeInstanceOf(AppException);
  });

  it('rejects inactive or missing selected options', async () => {
    await expect(
      validator.validateCreate({ ...base, visitReasonIds: ['option-1'] }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('rejects duplicate required-work display order', async () => {
    await expect(
      validator.validateCreate({
        ...base,
        requiredWorks: [
          { description: 'First', displayOrder: 1 },
          { description: 'Second', displayOrder: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('rejects blank work descriptions', async () => {
    await expect(
      validator.validateCreate({
        ...base,
        requiredWorks: [{ description: '   ', displayOrder: 0 }],
      }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('requires approval name and timestamp for approved cards', async () => {
    await expect(
      validator.validateCreate({ ...base, customerApproved: true }),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('rejects approval metadata on an unapproved new card', async () => {
    await expect(
      validator.validateCreate({
        ...base,
        customerApprovalName: 'Customer',
      }),
    ).rejects.toBeInstanceOf(AppException);
  });
});
