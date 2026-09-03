import { PaginatedResponseDto, PaginationMetaDto } from 'src/common/dto/paginated-response.dto';
import { UserResponseDto } from './user-response.dto';

export class PaginatedUsersResponseDto extends PaginatedResponseDto<UserResponseDto> {
  declare items: UserResponseDto[];

  declare meta: PaginationMetaDto;
}
