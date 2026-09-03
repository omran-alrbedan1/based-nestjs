import { Prisma } from 'generated/prisma/client';

export function buildUserWhereInput(search?: string): Prisma.UserWhereInput {
  return search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};
}
