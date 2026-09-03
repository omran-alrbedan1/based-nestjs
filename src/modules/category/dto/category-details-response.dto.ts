import { CategoryResponseDto } from './category-response.dto';

export class CategoryDetailsResponseDto extends CategoryResponseDto {
  productsCount!: number;
}
