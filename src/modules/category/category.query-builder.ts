import { Prisma } from 'generated/prisma/client';

export function buildCategoryWhereInput(
  search?: string,
): Prisma.CategoryWhereInput {
  return search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};
}
