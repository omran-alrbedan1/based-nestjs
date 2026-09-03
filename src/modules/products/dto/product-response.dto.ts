export class ProductCategorySummaryDto {
  id!: string;
  name!: string;
  slug!: string;
}

export class ProductResponseDto {
  id!: string;
  name!: string;
  description!: string | null;
  price!: string;
  stock!: number;
  sku!: string;
  imageUrl!: string | null;
  isActive!: boolean;
  categoryId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ProductDetailsResponseDto extends ProductResponseDto {
  category!: ProductCategorySummaryDto;
}
