import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OptionKind } from './maintenance-card-options.constants';

export interface OptionPersistenceRecord {
  id: number;
  code: string;
  labelEn: string;
  labelAr: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type OptionPersistenceData = Pick<
  OptionPersistenceRecord,
  'code' | 'labelEn' | 'labelAr' | 'displayOrder'
> & {
  createdByUserId: number;
};

export type OptionListArgs = {
  where: Record<string, unknown>;
  orderBy: Array<{ displayOrder: 'asc' } | { id: 'asc' }>;
  skip: number;
  take: number;
};

type UsageRecord = Pick<OptionPersistenceRecord, 'id' | 'code' | 'labelEn' | 'labelAr'> & {
  _count: { cardUsages: number };
};

@Injectable()
export class MaintenanceCardOptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(kind: OptionKind, args: OptionListArgs): Promise<OptionPersistenceRecord[]> {
    if (kind === 'visitReason') {
      return this.prisma.visitReason.findMany(args);
    }
    if (kind === 'vehicleCondition') {
      return this.prisma.vehicleConditionOption.findMany(args);
    }
    return this.prisma.vehicleItemOption.findMany(args);
  }

  count(kind: OptionKind, where: Record<string, unknown>): Promise<number> {
    if (kind === 'visitReason') {
      return this.prisma.visitReason.count({ where });
    }
    if (kind === 'vehicleCondition') {
      return this.prisma.vehicleConditionOption.count({
        where,
      });
    }
    return this.prisma.vehicleItemOption.count({ where });
  }

  findWithUsage(kind: OptionKind, id: number): Promise<UsageRecord | null> {
    const args = {
      where: { id },
      include: { _count: { select: { cardUsages: true } } },
    };
    if (kind === 'visitReason') {
      return this.prisma.visitReason.findUnique(args);
    }
    if (kind === 'vehicleCondition') {
      return this.prisma.vehicleConditionOption.findUnique(args);
    }
    return this.prisma.vehicleItemOption.findUnique(args);
  }

  create(kind: OptionKind, data: OptionPersistenceData): Promise<OptionPersistenceRecord> {
    if (kind === 'visitReason') {
      return this.prisma.visitReason.create({ data });
    }
    if (kind === 'vehicleCondition') {
      return this.prisma.vehicleConditionOption.create({
        data,
      });
    }
    return this.prisma.vehicleItemOption.create({ data });
  }

  update(
    kind: OptionKind,
    id: number,
    data: Partial<Omit<OptionPersistenceData, 'createdByUserId'>> | { isActive: boolean },
  ): Promise<OptionPersistenceRecord> {
    if (kind === 'visitReason') {
      return this.prisma.visitReason.update({
        where: { id },
        data,
      });
    }
    if (kind === 'vehicleCondition') {
      return this.prisma.vehicleConditionOption.update({
        where: { id },
        data,
      });
    }
    return this.prisma.vehicleItemOption.update({
      where: { id },
      data,
    });
  }

  delete(kind: OptionKind, id: number): Promise<OptionPersistenceRecord> {
    if (kind === 'visitReason') {
      return this.prisma.visitReason.delete({ where: { id } });
    }
    if (kind === 'vehicleCondition') {
      return this.prisma.vehicleConditionOption.delete({
        where: { id },
      });
    }
    return this.prisma.vehicleItemOption.delete({
      where: { id },
    });
  }
}
