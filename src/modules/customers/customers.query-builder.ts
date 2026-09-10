import { Prisma } from 'generated/prisma/client';
import { CustomerListQueryDto } from './dto/customer-list-query.dto';

export function buildCustomerWhere(
  query: CustomerListQueryDto,
  search?: string,
): Prisma.CustomerWhereInput {
  return {
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}
