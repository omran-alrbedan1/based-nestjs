import { OrderStatus, Prisma, Role } from 'generated/prisma';
import { OrderListQueryDto } from './dto/order-list-query.dto';

export function isAdmin(role: string): boolean {
  return role === Role.ADMIN;
}

export function buildOrderWhereInput(
  userId: string,
  role: string,
  listQueryDto: OrderListQueryDto,
  search?: string,
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (!isAdmin(role)) {
    where.userId = userId;
  } else if (listQueryDto.userId) {
    where.userId = listQueryDto.userId;
  }

  if (listQueryDto.status) {
    where.status = listQueryDto.status as OrderStatus;
  }

  if (search) {
    where.orderNumber = {
      contains: search,
      mode: 'insensitive',
    };
  }

  return where;
}
