import { Injectable } from '@nestjs/common';
import { MaintenanceCardStatus } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { getUtcDayRange } from './dashboard-date-range';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';

const GARAGE_TIME_ZONE = 'Asia/Amman';

interface CountGroup<T> {
  _count: { _all: number };
  status?: T;
  isActive?: boolean;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(now = new Date()): Promise<DashboardStatsResponseDto> {
    const today = getUtcDayRange(now, GARAGE_TIME_ZONE);
    const [maintenanceGroups, todayReceived, customerGroups, vehicleGroups] = await Promise.all([
      this.prisma.maintenanceCard.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.maintenanceCard.count({
        where: { receivedAt: { gte: today.start, lt: today.endExclusive } },
      }),
      this.prisma.customer.groupBy({
        by: ['isActive'],
        _count: { _all: true },
      }),
      this.prisma.vehicle.groupBy({
        by: ['isActive'],
        _count: { _all: true },
      }),
    ]);

    return {
      maintenance: {
        openCards: this.statusCount(maintenanceGroups, MaintenanceCardStatus.OPEN),
        closedCards: this.statusCount(maintenanceGroups, MaintenanceCardStatus.CLOSED),
        todayReceived,
        totalCards: this.total(maintenanceGroups),
      },
      customers: this.activeStats(customerGroups),
      vehicles: this.activeStats(vehicleGroups),
    };
  }

  private statusCount(
    groups: Array<CountGroup<MaintenanceCardStatus>>,
    status: MaintenanceCardStatus,
  ): number {
    return groups.find((group) => group.status === status)?._count._all ?? 0;
  }

  private activeStats(groups: Array<CountGroup<never>>): { active: number; total: number } {
    return {
      active: groups.find((group) => group.isActive)?._count._all ?? 0,
      total: this.total(groups),
    };
  }

  private total(groups: Array<CountGroup<unknown>>): number {
    return groups.reduce((sum, group) => sum + group._count._all, 0);
  }
}
