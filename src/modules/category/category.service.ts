import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryDetailsResponseDto } from './dto/category-details-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AppException } from 'src/common/exceptions/app.exception';
import { BaseListQueryDto } from 'src/common/dto/base-list-query.dto';
import {
  createPaginatedResponse,
  normalizeListQuery,
} from 'src/common/utils/pagination.util';
import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { formatCategory } from './category.mapper';
import { buildCategoryWhereInput } from './category.query-builder';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly categorySelect = {
    id: true,
    name: true,
    description: true,
    slug: true,
    imageUrl: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private readonly categoryDetailsSelect = {
    ...this.categorySelect,
    _count: {
      select: {
        products: true,
      },
    },
  } as const;

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        OR: [
          { name: createCategoryDto.name },
          { slug: createCategoryDto.slug },
        ],
      },
    });

    if (existingCategory) {
      throw new AppException(409, 'category.errors.duplicate_name_or_slug');
    }

    return await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        slug: createCategoryDto.slug,
        description: createCategoryDto.description,
        imageUrl: createCategoryDto.imageUrl,
        isActive: createCategoryDto.isActive ?? true,
      },
      select: this.categorySelect,
    });
  }

  async findAll(
    listQueryDto: BaseListQueryDto,
  ): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    const { page, limit, skip, search } = normalizeListQuery(listQueryDto);
    const where = buildCategoryWhereInput(search);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        select: this.categorySelect,
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return createPaginatedResponse(items, page, limit, total);
  }

  // get category by id :
  async findOne(id: string): Promise<CategoryDetailsResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: this.categoryDetailsSelect,
    });
    if (!category) {
      throw new AppException(404, 'category.errors.not_found');
    }

    return formatCategory(category);
  }

  // find by slug  :
  async findBySlug(slug: string): Promise<CategoryDetailsResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      select: this.categoryDetailsSelect,
    });

    if (!category) {
      throw new AppException(404, 'category.errors.not_found');
    }

    return formatCategory(category);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!category) {
      throw new AppException(404, 'category.errors.not_found');
    }

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const nameTaken = await this.prisma.category.findUnique({
        where: { name: updateCategoryDto.name },
        select: { id: true },
      });

      if (nameTaken) {
        throw new AppException(409, 'category.errors.name_taken');
      }
    }

    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const slugTaken = await this.prisma.category.findUnique({
        where: { slug: updateCategoryDto.slug },
        select: { id: true },
      });

      if (slugTaken) {
        throw new AppException(409, 'category.errors.slug_taken');
      }
    }

    return await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      select: this.categorySelect,
    });
  }

  async remove(id: string): Promise<null> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new AppException(404, 'category.errors.not_found');
    }

    if (category._count.products > 0) {
      throw new AppException(409, 'category.errors.delete_with_products');
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return null;
  }
}
