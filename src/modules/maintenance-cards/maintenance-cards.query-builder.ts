import { Prisma } from 'generated/prisma/client';
import { MaintenanceCardListQueryDto } from './dto/maintenance-card-list-query.dto';

export function buildMaintenanceCardWhere(
  query: MaintenanceCardListQueryDto,
  search?: string,
): Prisma.MaintenanceCardWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.vehicleId ? { vehicleOwnership: { vehicleId: query.vehicleId } } : {}),
    ...(query.receivedFrom || query.receivedTo
      ? {
          receivedAt: {
            ...(query.receivedFrom ? { gte: new Date(query.receivedFrom) } : {}),
            ...(query.receivedTo ? { lte: new Date(query.receivedTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? { cardNumber: { contains: search.trim().toUpperCase(), mode: 'insensitive' } }
      : {}),
  };
}
