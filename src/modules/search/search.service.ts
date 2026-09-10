import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

const RESULT_LIMIT = 10;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(rawQuery: string) {
    const query = rawQuery.trim();
    const normalizedIdentity = query.toUpperCase();
    const [customers, vehicles, maintenanceCards] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, phone: true, email: true, isActive: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: RESULT_LIMIT,
      }),
      this.prisma.vehicle.findMany({
        where: {
          OR: [
            { plateNumber: { contains: normalizedIdentity, mode: 'insensitive' } },
            { vin: { contains: normalizedIdentity, mode: 'insensitive' } },
            { make: { contains: query, mode: 'insensitive' } },
            { model: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          make: true,
          model: true,
          manufactureYear: true,
          plateNumber: true,
          vin: true,
          isActive: true,
          ownerships: {
            where: { endedAt: null },
            take: 1,
            select: { customer: { select: { id: true, name: true } } },
          },
        },
        orderBy: [{ plateNumber: 'asc' }, { id: 'asc' }],
        take: RESULT_LIMIT,
      }),
      this.prisma.maintenanceCard.findMany({
        where: { cardNumber: { contains: normalizedIdentity, mode: 'insensitive' } },
        select: {
          id: true,
          cardNumber: true,
          status: true,
          receivedAt: true,
          customer: { select: { id: true, name: true } },
          vehicleOwnership: {
            select: {
              vehicle: { select: { id: true, make: true, model: true, plateNumber: true } },
            },
          },
        },
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        take: RESULT_LIMIT,
      }),
    ]);

    return {
      customers,
      vehicles: vehicles.map(({ ownerships, ...vehicle }) => ({
        ...vehicle,
        currentOwner: ownerships[0]?.customer ?? null,
      })),
      maintenanceCards,
    };
  }
}
