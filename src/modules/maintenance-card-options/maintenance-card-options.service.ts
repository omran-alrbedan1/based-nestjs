import { Injectable } from '@nestjs/common';
import { Role } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateMaintenanceCardOptionDto,
  UpdateMaintenanceCardOptionDto,
} from './dto/maintenance-card-option.dto';

export type OptionKind = 'visitReason' | 'vehicleCondition' | 'vehicleItem';

@Injectable()
export class MaintenanceCardOptionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(kind: OptionKind, isActive?: boolean) {
    const args = {
      where: isActive === undefined ? {} : { isActive },
      orderBy: [{ displayOrder: 'asc' as const }, { id: 'asc' as const }],
    };
    if (kind === 'visitReason') return this.prisma.visitReason.findMany(args);
    if (kind === 'vehicleCondition') return this.prisma.vehicleConditionOption.findMany(args);
    return this.prisma.vehicleItemOption.findMany(args);
  }

  async create(
    kind: OptionKind,
    dto: CreateMaintenanceCardOptionDto,
    userId: string,
    role: string,
  ) {
    this.assertSuperAdmin(role);
    const data = {
      code: dto.code.trim().toUpperCase(),
      label: dto.label.trim(),
      displayOrder: dto.displayOrder,
      createdByUserId: userId,
    };
    try {
      if (kind === 'visitReason') return await this.prisma.visitReason.create({ data });
      if (kind === 'vehicleCondition') {
        return await this.prisma.vehicleConditionOption.create({ data });
      }
      return await this.prisma.vehicleItemOption.create({ data });
    } catch (error) {
      this.throwWriteError(error);
    }
  }

  async update(kind: OptionKind, id: string, dto: UpdateMaintenanceCardOptionDto, role: string) {
    this.assertSuperAdmin(role);
    const current = await this.findWithUsage(kind, id);
    if (!current) throw new AppException(404, 'maintenanceCardOptions.errors.not_found');
    const used = current._count.cardUsages > 0;
    const normalizedCode = dto.code?.trim().toUpperCase();
    const normalizedLabel = dto.label?.trim();
    if (
      used &&
      ((normalizedCode !== undefined && normalizedCode !== current.code) ||
        (normalizedLabel !== undefined && normalizedLabel !== current.label))
    ) {
      throw new AppException(409, 'maintenanceCardOptions.errors.used_immutable');
    }
    const data = {
      ...(normalizedCode !== undefined ? { code: normalizedCode } : {}),
      ...(normalizedLabel !== undefined ? { label: normalizedLabel } : {}),
      ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
    };
    try {
      if (kind === 'visitReason')
        return await this.prisma.visitReason.update({ where: { id }, data });
      if (kind === 'vehicleCondition') {
        return await this.prisma.vehicleConditionOption.update({ where: { id }, data });
      }
      return await this.prisma.vehicleItemOption.update({ where: { id }, data });
    } catch (error) {
      this.throwWriteError(error);
    }
  }

  setActive(kind: OptionKind, id: string, isActive: boolean, role: string) {
    this.assertSuperAdmin(role);
    return this.updateActive(kind, id, isActive);
  }

  async delete(kind: OptionKind, id: string, role: string): Promise<null> {
    this.assertSuperAdmin(role);
    const current = await this.findWithUsage(kind, id);
    if (!current) throw new AppException(404, 'maintenanceCardOptions.errors.not_found');
    if (current._count.cardUsages > 0) {
      throw new AppException(409, 'maintenanceCardOptions.errors.used_delete');
    }
    try {
      if (kind === 'visitReason') await this.prisma.visitReason.delete({ where: { id } });
      else if (kind === 'vehicleCondition') {
        await this.prisma.vehicleConditionOption.delete({ where: { id } });
      } else await this.prisma.vehicleItemOption.delete({ where: { id } });
      return null;
    } catch (error) {
      if (this.hasErrorCode(error, 'P2003')) {
        throw new AppException(409, 'maintenanceCardOptions.errors.used_delete');
      }
      throw new AppException(500, 'database.errors.operation_failed');
    }
  }

  private async updateActive(kind: OptionKind, id: string, isActive: boolean) {
    const exists = await this.findWithUsage(kind, id);
    if (!exists) throw new AppException(404, 'maintenanceCardOptions.errors.not_found');
    const data = { isActive };
    if (kind === 'visitReason') return this.prisma.visitReason.update({ where: { id }, data });
    if (kind === 'vehicleCondition') {
      return this.prisma.vehicleConditionOption.update({ where: { id }, data });
    }
    return this.prisma.vehicleItemOption.update({ where: { id }, data });
  }

  private findWithUsage(kind: OptionKind, id: string) {
    const args = { where: { id }, include: { _count: { select: { cardUsages: true } } } };
    if (kind === 'visitReason') return this.prisma.visitReason.findUnique(args);
    if (kind === 'vehicleCondition') return this.prisma.vehicleConditionOption.findUnique(args);
    return this.prisma.vehicleItemOption.findUnique(args);
  }

  private assertSuperAdmin(role: string): void {
    if (role !== Role.SUPER_ADMIN) {
      throw new AppException(403, 'maintenanceCardOptions.errors.manage_forbidden');
    }
  }

  private throwWriteError(error: unknown): never {
    if (this.hasErrorCode(error, 'P2002')) {
      throw new AppException(409, 'maintenanceCardOptions.errors.duplicate_code');
    }
    throw new AppException(500, 'database.errors.operation_failed');
  }

  private hasErrorCode(error: unknown, expected: string): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as Record<string, unknown>;
    return candidate.code === expected;
  }
}
