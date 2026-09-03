import { PaginatedResponseDto, PaginationMetaDto } from 'src/common/dto/paginated-response.dto';
import { CategoryResponseDto } from './category-response.dto';

export class PaginatedCategoriesResponseDto extends PaginatedResponseDto<CategoryResponseDto> {
  declare items: CategoryResponseDto[];
  declare meta: PaginationMetaDto;
}
