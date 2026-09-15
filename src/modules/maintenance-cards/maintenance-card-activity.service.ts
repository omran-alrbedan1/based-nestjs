import { Injectable } from '@nestjs/common';
import { AppException } from 'src/common/exceptions/app.exception';
import { createPaginatedResponse, normalizePagination } from 'src/common/utils/pagination.util';
import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ActivityItem,
  toCardActivityItem,
  toWorkActivityItem,
} from './maintenance-card-activity.mapper';

const actorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

@Injectable()
export class MaintenanceCardActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Merges the card's status events with its work events into a single
   * newest-first timeline. Index pagination is applied after merging because
   * the two sources are independent tables.
   */
  async getActivity(
    cardId: number,
    query: { page?: number; limit?: number },
  ): Promise<PaginatedResponseDto<ActivityItem>> {
    const card = await this.prisma.maintenanceCard.findUnique({
      where: { id: cardId },
      select: { id: true },
    });
    if (!card) throw new AppException(404, 'maintenanceCards.errors.not_found');

    const { page, limit, skip } = normalizePagination(query);

    const [cardEvents, workEvents] = await Promise.all([
      this.prisma.maintenanceCardStatusEvent.findMany({
        where: { maintenanceCardId: cardId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { changedBy: { select: actorSelect } },
      }),
      this.prisma.maintenanceWorkEvent.findMany({
        where: { maintenanceCardId: cardId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { changedBy: { select: actorSelect } },
      }),
    ]);

    const merged: ActivityItem[] = [
      ...cardEvents.map((e) => toCardActivityItem(e as never)),
      ...workEvents.map((e) => toWorkActivityItem(e as never)),
    ].sort((a, b) => {
      const byTime = b.occurredAt.getTime() - a.occurredAt.getTime();
      return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
    });

    const total = merged.length;
    const items = merged.slice(skip, skip + limit);
    return createPaginatedResponse(items, page, limit, total);
  }
}
