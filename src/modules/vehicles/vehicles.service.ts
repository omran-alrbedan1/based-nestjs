import { Injectable } from '@nestjs/common';
import { AppException } from 'src/common/exceptions/app.exception';
import { createPaginatedResponse, normalizeListQuery } from 'src/common/utils/pagination.util';
import { hasPrismaErrorCode } from 'src/common/utils/prisma-error.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleListQueryDto } from './dto/vehicle-list-query.dto';
import { buildVehicleWhere } from './vehicles.query-builder';
import { MaintenanceHistoryQueryDto } from 'src/common/dto/maintenance-history-query.dto';
import { normalizePagination } from 'src/common/utils/pagination.util';
import {
  buildHistoryCardWhere,
  validateHistoryDateRange,
} from 'src/common/utils/maintenance-history.util';
import { customerSummarySelect, vehicleSelect } from './vehicles.selects';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVehicleDto) {
    const normalized = this.normalizeVehicle(dto);
    const customer = await this.prisma.customer.findUnique({
      where: { id: normalized.customerId },
      select: { id: true, isActive: true },
    });
    if (!customer) throw new AppException(404, 'customers.errors.not_found');
    if (!customer.isActive) throw new AppException(409, 'customers.errors.inactive');

    await this.assertUniqueVehicleIdentity(normalized.plateNumber, normalized.vin);
    const { customerId, ...vehicleData } = normalized;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.create({ data: vehicleData, select: vehicleSelect });
        const ownership = await tx.vehicleOwnership.create({
          data: { vehicleId: vehicle.id, customerId, startedAt: new Date() },
          select: {
            id: true,
            customerId: true,
            startedAt: true,
            customer: { select: customerSummarySelect },
          },
        });
        return { ...vehicle, currentOwnership: ownership };
      });
    } catch (error) {
      this.throwVehicleWriteError(error);
    }
  }

  async findAll(query: VehicleListQueryDto) {
    const { page, limit, skip, search } = normalizeListQuery(query);
    const where = buildVehicleWhere(query, search);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        select: {
          ...vehicleSelect,
          ownerships: {
            where: { endedAt: null },
            take: 1,
            select: {
              id: true,
              startedAt: true,
              customer: { select: customerSummarySelect },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    const mapped = items.map(({ ownerships, ...vehicle }) => ({
      ...vehicle,
      currentOwnership: ownerships[0] ?? null,
    }));
    return createPaginatedResponse(mapped, page, limit, total);
  }

  async findOne(id: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      select: {
        ...vehicleSelect,
        ownerships: {
          orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            startedAt: true,
            endedAt: true,
            customer: { select: customerSummarySelect },
          },
        },
      },
    });
    if (!vehicle) throw new AppException(404, 'vehicles.errors.not_found');
    const currentOwnership = vehicle.ownerships.find(({ endedAt }) => endedAt === null) ?? null;
    return { ...vehicle, currentOwnership };
  }

  async maintenanceHistory(id: number, query: MaintenanceHistoryQueryDto) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      select: {
        ...vehicleSelect,
        ownerships: {
          where: { endedAt: null },
          take: 1,
          select: {
            id: true,
            startedAt: true,
            customer: { select: customerSummarySelect },
          },
        },
      },
    });
    if (!vehicle) throw new AppException(404, 'vehicles.errors.not_found');
    validateHistoryDateRange(query);
    const { ownerships, ...vehicleSummary } = vehicle;
    const { page, limit, skip } = normalizePagination(query);
    const where = {
      ...buildHistoryCardWhere(query),
      vehicleOwnership: { vehicleId: id },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.maintenanceCard.findMany({
        where,
        select: {
          id: true,
          cardNumber: true,
          status: true,
          receivedAt: true,
          expectedDeliveryAt: true,
          mileage: true,
          customer: { select: customerSummarySelect },
          vehicleOwnership: { select: { id: true, startedAt: true, endedAt: true } },
        },
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.maintenanceCard.count({ where }),
    ]);
    return {
      vehicle: vehicleSummary,
      currentOwner: ownerships[0] ?? null,
      history: createPaginatedResponse(items, page, limit, total),
    };
  }

  async update(id: number, dto: UpdateVehicleDto) {
    const normalized = this.normalizeVehicle(dto);
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      select: { id: true, plateNumber: true, vin: true, isActive: true },
    });
    if (!vehicle) throw new AppException(404, 'vehicles.errors.not_found');

    const plateNumber = normalized.plateNumber ?? vehicle.plateNumber;
    const vin = normalized.vin ?? vehicle.vin ?? undefined;
    await this.assertUniqueVehicleIdentity(plateNumber, vin, id, vehicle.isActive);

    try {
      return await this.prisma.vehicle.update({
        where: { id },
        data: normalized,
        select: vehicleSelect,
      });
    } catch (error) {
      this.throwVehicleWriteError(error);
    }
  }

  deactivate(id: number) {
    return this.setActive(id, false);
  }

  activate(id: number) {
    return this.setActive(id, true);
  }

  private async setActive(id: number, isActive: boolean) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      select: { id: true, plateNumber: true },
    });
    if (!vehicle) throw new AppException(404, 'vehicles.errors.not_found');
    if (isActive) await this.assertUniqueVehicleIdentity(vehicle.plateNumber, undefined, id);
    return this.prisma.vehicle.update({
      where: { id },
      data: { isActive },
      select: vehicleSelect,
    });
  }

  private async assertUniqueVehicleIdentity(
    plateNumber: string,
    vin?: string,
    excludeId?: number,
    checkActivePlate = true,
  ): Promise<void> {
    if (checkActivePlate) {
      const plateDuplicate = await this.prisma.vehicle.findFirst({
        where: {
          plateNumber,
          isActive: true,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (plateDuplicate) throw new AppException(409, 'vehicles.errors.duplicate_active_plate');
    }

    if (vin) {
      const vinDuplicate = await this.prisma.vehicle.findFirst({
        where: { vin, ...(excludeId ? { id: { not: excludeId } } : {}) },
        select: { id: true },
      });
      if (vinDuplicate) throw new AppException(409, 'vehicles.errors.duplicate_vin');
    }
  }

  private throwVehicleWriteError(error: unknown): never {
    if (hasPrismaErrorCode(error, 'P2002')) {
      throw new AppException(409, 'vehicles.errors.duplicate_vin');
    }
    throw error;
  }

  private normalizeVehicle(dto: CreateVehicleDto): CreateVehicleDto;
  private normalizeVehicle(dto: UpdateVehicleDto): UpdateVehicleDto;
  private normalizeVehicle(
    dto: CreateVehicleDto | UpdateVehicleDto,
  ): CreateVehicleDto | UpdateVehicleDto {
    return {
      ...dto,
      ...(dto.make !== undefined ? { make: dto.make.trim() } : {}),
      ...(dto.model !== undefined ? { model: dto.model.trim() } : {}),
      ...(dto.plateNumber !== undefined
        ? { plateNumber: dto.plateNumber.trim().toUpperCase() }
        : {}),
      ...(dto.vin !== undefined ? { vin: dto.vin.trim().toUpperCase() } : {}),
      ...(dto.color !== undefined ? { color: dto.color.trim() } : {}),
    };
  }
}
