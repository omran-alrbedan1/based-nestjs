import { Prisma } from 'generated/prisma/client';
import { AppException } from '../exceptions/app.exception';
import { MaintenanceHistoryQueryDto } from '../dto/maintenance-history-query.dto';

export function validateHistoryDateRange(query: MaintenanceHistoryQueryDto): void {
  if (
    query.receivedFrom &&
    query.receivedTo &&
    new Date(query.receivedFrom) > new Date(query.receivedTo)
  ) {
    throw new AppException(400, 'maintenanceCards.errors.invalid_date_range');
  }
}

export function buildHistoryCardWhere(
  query: MaintenanceHistoryQueryDto,
): Prisma.MaintenanceCardWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.receivedFrom || query.receivedTo
      ? {
          receivedAt: {
            ...(query.receivedFrom ? { gte: new Date(query.receivedFrom) } : {}),
            ...(query.receivedTo ? { lte: new Date(query.receivedTo) } : {}),
          },
        }
      : {}),
  };
}
