import { Injectable } from '@nestjs/common';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { customerSummarySelect } from './vehicles.selects';

@Injectable()
export class VehicleOwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnership(id: number) {
    await this.assertVehicleExists(id);
    const history = await this.prisma.vehicleOwnership.findMany({
      where: { vehicleId: id },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        vehicleId: true,
        customerId: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: customerSummarySelect },
      },
    });
    return {
      currentOwner: history.find(({ endedAt }) => endedAt === null) ?? null,
      history,
    };
  }

  async transferOwnership(vehicleId: number, dto: TransferOwnershipDto) {
    const transferAt = new Date();
    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({
        where: { id: vehicleId },
        select: { id: true, isActive: true },
      });
      if (!vehicle) throw new AppException(404, 'vehicles.errors.not_found');
      if (!vehicle.isActive) throw new AppException(409, 'vehicles.errors.inactive');

      const customer = await tx.customer.findUnique({
        where: { id: dto.customerId },
        select: { id: true, isActive: true },
      });
      if (!customer) throw new AppException(404, 'customers.errors.not_found');
      if (!customer.isActive) throw new AppException(409, 'customers.errors.inactive');

      const current = await tx.vehicleOwnership.findFirst({
        where: { vehicleId, endedAt: null },
        select: { id: true, customerId: true },
      });
      if (!current) throw new AppException(409, 'ownership.errors.current_not_found');
      if (current.customerId === dto.customerId) {
        throw new AppException(409, 'ownership.errors.same_customer');
      }

      const ended = await tx.vehicleOwnership.updateMany({
        where: { id: current.id, endedAt: null },
        data: { endedAt: transferAt },
      });
      if (ended.count !== 1) {
        throw new AppException(409, 'ownership.errors.concurrent_transfer');
      }

      return tx.vehicleOwnership.create({
        data: { vehicleId, customerId: dto.customerId, startedAt: transferAt },
        select: {
          id: true,
          vehicleId: true,
          customerId: true,
          startedAt: true,
          endedAt: true,
          customer: { select: customerSummarySelect },
        },
      });
    });
  }

  private async assertVehicleExists(id: number): Promise<void> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id }, select: { id: true } });
    if (!vehicle) throw new AppException(404, 'vehicles.errors.not_found');
  }
}
