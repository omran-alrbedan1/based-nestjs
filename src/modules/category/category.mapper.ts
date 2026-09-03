import { CategoryDetailsResponseDto } from './dto/category-details-response.dto';
import { CategoryDetailsRecord } from './category.types';

export function formatCategory(
  category: CategoryDetailsRecord,
): CategoryDetailsResponseDto {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    slug: category.slug,
    imageUrl: category.imageUrl,
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    productsCount: category._count.products,
  };
}
