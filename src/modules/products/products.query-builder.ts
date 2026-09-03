import { Prisma } from 'generated/prisma/client';
import { ProductListQueryDto } from './dto/product-list-query.dto';

export function buildProductWhereInput(
  listQueryDto: ProductListQueryDto,
  search?: string,
): Prisma.ProductWhereInput {
  return {
    ...(listQueryDto.categoryId ? { categoryId: listQueryDto.categoryId } : {}),
    ...(typeof listQueryDto.isActive === 'boolean'
      ? { isActive: listQueryDto.isActive }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}
