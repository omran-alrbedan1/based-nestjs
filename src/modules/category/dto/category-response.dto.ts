export class CategoryResponseDto {
  id!: string;

  name!: string;

  description!: string | null;

  slug!: string;

  imageUrl!: string | null;

  isActive!: boolean;

  createdAt!: Date;

  updatedAt!: Date;
}
