import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from 'generated/prisma';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { ResponseMessage } from 'src/utils/transform.interceptor';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryDetailsResponseDto } from './dto/category-details-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { BaseListQueryDto } from 'src/common/dto/base-list-query.dto';
import { CategoryService } from './category.service';
import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';

@Controller('category')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ResponseMessage('category.responses.category_created')
  async createCategory(@Body() createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return await this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ResponseMessage('category.responses.list_retrieved')
  async findAll(
    @Query() listQueryDto: BaseListQueryDto,
  ): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    return await this.categoryService.findAll(listQueryDto);
  }

  @Get('slug/:slug')
  @ResponseMessage('category.responses.category_retrieved')
  async findBySlug(@Param('slug') slug: string): Promise<CategoryDetailsResponseDto> {
    return await this.categoryService.findBySlug(slug);
  }

  @Get(':id')
  @ResponseMessage('category.responses.category_retrieved')
  async findOne(@Param('id') id: string): Promise<CategoryDetailsResponseDto> {
    return await this.categoryService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('category.responses.category_updated')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return await this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('category.responses.category_deleted')
  async remove(@Param('id') id: string): Promise<null> {
    return await this.categoryService.remove(id);
  }
}
