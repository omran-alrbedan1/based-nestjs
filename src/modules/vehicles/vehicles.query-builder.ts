import { Prisma } from 'generated/prisma/client';
import { VehicleListQueryDto } from './dto/vehicle-list-query.dto';

export function buildVehicleWhere(
  query: VehicleListQueryDto,
  search?: string,
): Prisma.VehicleWhereInput {
  return {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.customerId
      ? { ownerships: { some: { customerId: query.customerId, endedAt: null } } }
      : {}),
    ...(search
      ? {
          OR: [
            { plateNumber: { contains: search, mode: 'insensitive' } },
            { vin: { contains: search, mode: 'insensitive' } },
            { make: { contains: search, mode: 'insensitive' } },
            { model: { contains: search, mode: 'insensitive' } },
            {
              ownerships: {
                some: {
                  endedAt: null,
                  customer: {
                    OR: [
                      { name: { contains: search, mode: 'insensitive' } },
                      { phone: { contains: search, mode: 'insensitive' } },
                      { email: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
}
