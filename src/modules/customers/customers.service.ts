import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AppException } from 'src/common/exceptions/app.exception';
import { createPaginatedResponse, normalizeListQuery } from 'src/common/utils/pagination.util';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerListQueryDto } from './dto/customer-list-query.dto';
import { buildCustomerWhere } from './customers.query-builder';
import { CustomerMaintenanceHistoryQueryDto } from 'src/common/dto/maintenance-history-query.dto';
import { normalizePagination } from 'src/common/utils/pagination.util';
import {
  buildHistoryCardWhere,
  validateHistoryDateRange,
} from 'src/common/utils/maintenance-history.util';

const customerSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: this.normalizeCustomer(dto),
      select: customerSelect,
    });
  }

  async findAll(query: CustomerListQueryDto) {
    const { page, limit, skip, search } = normalizeListQuery(query);
    const where = buildCustomerWhere(query, search);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        select: customerSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return createPaginatedResponse(items, page, limit, total);
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        vehicleOwnerships: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            startedAt: true,
            vehicle: {
              select: {
                id: true,
                make: true,
                model: true,
                manufactureYear: true,
                plateNumber: true,
                vin: true,
                color: true,
                transmission: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });
    if (!customer) throw new AppException(404, 'customers.errors.not_found');
    const { vehicleOwnerships, ...basic } = customer;
    return {
      ...basic,
      currentVehicles: vehicleOwnerships.map(({ id: ownershipId, startedAt, vehicle }) => ({
        ...vehicle,
        ownershipId,
        ownedSince: startedAt,
      })),
    };
  }

  async maintenanceHistory(id: number, query: CustomerMaintenanceHistoryQueryDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, email: true, isActive: true },
    });
    if (!customer) throw new AppException(404, 'customers.errors.not_found');
    validateHistoryDateRange(query);
    const { page, limit, skip } = normalizePagination(query);
    const where = {
      ...buildHistoryCardWhere(query),
      customerId: id,
      ...(query.vehicleId ? { vehicleOwnership: { vehicleId: query.vehicleId } } : {}),
    } as const;
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
          vehicleOwnership: {
            select: {
              id: true,
              startedAt: true,
              endedAt: true,
              vehicle: {
                select: { id: true, make: true, model: true, plateNumber: true, vin: true },
              },
            },
          },
        },
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.maintenanceCard.count({ where }),
    ]);
    return { customer, history: createPaginatedResponse(items, page, limit, total) };
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.assertExists(id);
    return this.prisma.customer.update({
      where: { id },
      data: this.normalizeCustomer(dto),
      select: customerSelect,
    });
  }

  deactivate(id: number) {
    return this.setActive(id, false);
  }

  activate(id: number) {
    return this.setActive(id, true);
  }

  private async setActive(id: number, isActive: boolean) {
    await this.assertExists(id);
    return this.prisma.customer.update({
      where: { id },
      data: { isActive },
      select: customerSelect,
    });
  }

  private async assertExists(id: number): Promise<void> {
    const customer = await this.prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!customer) throw new AppException(404, 'customers.errors.not_found');
  }

  private normalizeCustomer(dto: CreateCustomerDto): CreateCustomerDto;
  private normalizeCustomer(dto: UpdateCustomerDto): UpdateCustomerDto;
  private normalizeCustomer(
    dto: CreateCustomerDto | UpdateCustomerDto,
  ): CreateCustomerDto | UpdateCustomerDto {
    return {
      ...dto,
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
      ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
    };
  }
}
