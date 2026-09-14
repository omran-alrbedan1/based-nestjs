import { Injectable } from '@nestjs/common';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateMaintenanceCardDto,
  RequiredWorkInputDto,
  UpdateMaintenanceCardDto,
} from './dto/maintenance-card.dto';

@Injectable()
export class MaintenanceCardValidator {
  constructor(private readonly prisma: PrismaService) {}

  async validateCreate(dto: CreateMaintenanceCardDto): Promise<void> {
    await this.validateOwnership(dto.customerId, dto.vehicleOwnershipId);
    await this.validateActiveOptions(dto);
    this.validateWorks(dto.requiredWorks);
    this.validateDates(new Date(dto.receivedAt), dto.expectedDeliveryAt);
    this.validateApproval(dto.customerApproved, dto.customerApprovalName, dto.customerApprovedAt);
    if (!dto.customerApproved && this.hasApprovalMetadata(dto)) {
      throw new AppException(400, 'maintenanceCards.errors.approval_metadata_without_approval');
    }
  }

  async validateUpdate(
    current: {
      receivedAt: Date;
      customerApproved: boolean;
      customerApprovalName: string | null;
      customerApprovedAt: Date | null;
    },
    dto: UpdateMaintenanceCardDto,
  ): Promise<void> {
    await this.validateActiveOptions(dto);
    this.validateDates(current.receivedAt, dto.expectedDeliveryAt);
    const approved = dto.customerApproved ?? current.customerApproved;
    const name = dto.customerApprovalName ?? current.customerApprovalName ?? undefined;
    const approvedAt = dto.customerApprovedAt ?? current.customerApprovedAt?.toISOString();
    this.validateApproval(approved, name, approvedAt);
    if (!approved && dto.customerApproved !== false && this.hasApprovalMetadata(dto)) {
      throw new AppException(400, 'maintenanceCards.errors.approval_metadata_without_approval');
    }
  }

  private async validateOwnership(customerId: number, ownershipId: number): Promise<void> {
    const ownership = await this.prisma.vehicleOwnership.findUnique({
      where: { id: ownershipId },
      select: {
        customerId: true,
        endedAt: true,
        customer: { select: { isActive: true } },
        vehicle: { select: { isActive: true } },
      },
    });
    if (!ownership) throw new AppException(404, 'maintenanceCards.errors.ownership_not_found');
    if (ownership.customerId !== customerId) {
      throw new AppException(409, 'maintenanceCards.errors.ownership_customer_mismatch');
    }
    if (ownership.endedAt) {
      throw new AppException(409, 'maintenanceCards.errors.ownership_not_current');
    }
    if (!ownership.customer.isActive) {
      throw new AppException(409, 'maintenanceCards.errors.inactive_customer');
    }
    if (!ownership.vehicle.isActive) {
      throw new AppException(409, 'maintenanceCards.errors.inactive_vehicle');
    }
  }

  private async validateActiveOptions(
    dto: Pick<
      CreateMaintenanceCardDto,
      'visitReasonIds' | 'vehicleConditionOptionIds' | 'vehicleItemOptionIds'
    >,
  ): Promise<void> {
    await Promise.all([
      this.assertActiveCount(dto.visitReasonIds, (ids) =>
        this.prisma.visitReason.count({ where: { id: { in: ids }, isActive: true } }),
      ),
      this.assertActiveCount(dto.vehicleConditionOptionIds, (ids) =>
        this.prisma.vehicleConditionOption.count({
          where: { id: { in: ids }, isActive: true },
        }),
      ),
      this.assertActiveCount(dto.vehicleItemOptionIds, (ids) =>
        this.prisma.vehicleItemOption.count({ where: { id: { in: ids }, isActive: true } }),
      ),
    ]);
  }

  private async assertActiveCount(
    ids: number[] | undefined,
    count: (ids: number[]) => Promise<number>,
  ): Promise<void> {
    if (ids === undefined || ids.length === 0) return;
    if ((await count(ids)) !== ids.length) {
      throw new AppException(400, 'maintenanceCards.errors.inactive_or_invalid_option');
    }
  }

  private validateWorks(works?: RequiredWorkInputDto[]): void {
    if (works === undefined) return;
    const orders = works.map(({ displayOrder }) => displayOrder);
    if (new Set(orders).size !== orders.length) {
      throw new AppException(400, 'maintenanceCards.errors.duplicate_work_order');
    }
    if (works.some(({ description }) => description.trim().length === 0)) {
      throw new AppException(400, 'maintenanceCards.errors.blank_work');
    }
  }

  private validateDates(receivedAt: Date, expected?: string): void {
    if (expected && new Date(expected) < receivedAt) {
      throw new AppException(400, 'maintenanceCards.errors.invalid_delivery_date');
    }
  }

  private validateApproval(approved: boolean, name?: string, approvedAt?: string): void {
    if (approved && (!name?.trim() || !approvedAt)) {
      throw new AppException(400, 'maintenanceCards.errors.incomplete_approval');
    }
  }

  private hasApprovalMetadata(dto: UpdateMaintenanceCardDto): boolean {
    return dto.customerApprovalName !== undefined || dto.customerApprovedAt !== undefined;
  }
}
