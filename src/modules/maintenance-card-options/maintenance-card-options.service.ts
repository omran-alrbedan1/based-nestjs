import { Injectable } from '@nestjs/common';
import { Role } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { getRequestLanguage } from 'src/common/utils/locale.util';
import { createPaginatedResponse, normalizeListQuery } from 'src/common/utils/pagination.util';
import { hasPrismaErrorCode } from 'src/common/utils/prisma-error.util';
import {
  CreateMaintenanceCardOptionDto,
  OptionListQueryDto,
  UpdateMaintenanceCardOptionDto,
} from './dto/maintenance-card-option.dto';
import { OptionKind } from './maintenance-card-options.constants';
import { MaintenanceCardOptionsRepository } from './maintenance-card-options.repository';
import { toOptionResponse } from './maintenance-option.mapper';
import { buildOptionWhereInput } from './maintenance-option.query-builder';

@Injectable()
export class MaintenanceCardOptionsService {
  constructor(private readonly repository: MaintenanceCardOptionsRepository) {}

  async list(kind: OptionKind, query: OptionListQueryDto) {
    const { page, limit, skip, search } = normalizeListQuery(query);
    const where = buildOptionWhereInput({ search, isActive: query.isActive });
    const findArgs = {
      where,
      orderBy: [{ displayOrder: 'asc' as const }, { id: 'asc' as const }],
      skip,
      take: limit,
    };
    const lang = getRequestLanguage();
    const [rows, total] = await Promise.all([
      this.repository.findMany(kind, findArgs),
      this.repository.count(kind, where),
    ]);
    return createPaginatedResponse(
      rows.map((row) => toOptionResponse(row, lang)),
      page,
      limit,
      total,
    );
  }

  async create(kind: OptionKind, dto: CreateMaintenanceCardOptionDto, userId: number, role: Role) {
    this.assertSuperAdmin(role);
    const data = {
      code: dto.code.trim().toUpperCase(),
      labelEn: dto.labelEn.trim(),
      labelAr: dto.labelAr.trim(),
      displayOrder: dto.displayOrder,
      createdByUserId: userId,
    };
    try {
      return await this.repository.create(kind, data);
    } catch (error) {
      this.throwWriteError(error);
    }
  }

  async update(kind: OptionKind, id: number, dto: UpdateMaintenanceCardOptionDto, role: Role) {
    this.assertSuperAdmin(role);
    const current = await this.findWithUsage(kind, id);
    if (!current) throw new AppException(404, 'maintenanceCardOptions.errors.not_found');
    const used = current._count.cardUsages > 0;
    const normalizedCode = dto.code?.trim().toUpperCase();
    const normalizedEn = dto.labelEn?.trim();
    const normalizedAr = dto.labelAr?.trim();
    if (
      used &&
      ((normalizedCode !== undefined && normalizedCode !== current.code) ||
        (normalizedEn !== undefined && normalizedEn !== current.labelEn) ||
        (normalizedAr !== undefined && normalizedAr !== current.labelAr))
    ) {
      throw new AppException(409, 'maintenanceCardOptions.errors.used_immutable');
    }
    const data = {
      ...(normalizedCode !== undefined ? { code: normalizedCode } : {}),
      ...(normalizedEn !== undefined ? { labelEn: normalizedEn } : {}),
      ...(normalizedAr !== undefined ? { labelAr: normalizedAr } : {}),
      ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
    };
    try {
      return await this.repository.update(kind, id, data);
    } catch (error) {
      this.throwWriteError(error);
    }
  }

  setActive(kind: OptionKind, id: number, isActive: boolean, role: Role) {
    this.assertSuperAdmin(role);
    return this.updateActive(kind, id, isActive);
  }

  async delete(kind: OptionKind, id: number, role: Role): Promise<null> {
    this.assertSuperAdmin(role);
    const current = await this.findWithUsage(kind, id);
    if (!current) throw new AppException(404, 'maintenanceCardOptions.errors.not_found');
    if (current._count.cardUsages > 0) {
      throw new AppException(409, 'maintenanceCardOptions.errors.used_delete');
    }
    try {
      await this.repository.delete(kind, id);
      return null;
    } catch (error) {
      if (hasPrismaErrorCode(error, 'P2003')) {
        throw new AppException(409, 'maintenanceCardOptions.errors.used_delete');
      }
      this.throwWriteError(error);
    }
  }

  private async updateActive(kind: OptionKind, id: number, isActive: boolean) {
    const exists = await this.findWithUsage(kind, id);
    if (!exists) throw new AppException(404, 'maintenanceCardOptions.errors.not_found');
    return this.repository.update(kind, id, { isActive });
  }

  private findWithUsage(kind: OptionKind, id: number) {
    return this.repository.findWithUsage(kind, id);
  }

  private assertSuperAdmin(role: Role): void {
    if (role !== Role.SUPER_ADMIN) {
      throw new AppException(403, 'maintenanceCardOptions.errors.manage_forbidden');
    }
  }

  private throwWriteError(error: unknown): never {
    if (hasPrismaErrorCode(error, 'P2002')) {
      throw new AppException(409, 'maintenanceCardOptions.errors.duplicate_code');
    }
    throw error;
  }
}
