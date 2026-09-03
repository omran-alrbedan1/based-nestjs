import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  createPaginatedResponse,
  normalizeListQuery,
} from 'src/common/utils/pagination.util';
import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  ProductDetailsResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStockDto } from './dto/update-product-stock.dto';
import { formatProduct, formatProductDetails } from './products.mapper';
import { buildProductWhereInput } from './products.query-builder';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly productSelect = {
    id: true,
    name: true,
    description: true,
    price: true,
    stock: true,
    sku: true,
    imageUrl: true,
    isActive: true,
    categoryId: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  private readonly productDetailsSelect = {
    ...this.productSelect,
    category: {
      select: {
        id: true,
        name: true,
        slug: true,
      },
    },
  } as const;

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new AppException(404, 'products.errors.category_not_found');
    }
  }

  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const existingProduct = await this.prisma.product.findUnique({
      where: { sku: createProductDto.sku },
      select: { id: true },
    });

    if (existingProduct) {
      throw new AppException(409, 'products.errors.sku_taken');
    }

    await this.ensureCategoryExists(createProductDto.categoryId);

    const product = await this.prisma.product.create({
      data: {
        ...createProductDto,
        price: new Prisma.Decimal(createProductDto.price),
        isActive: createProductDto.isActive ?? true,
      },
      select: this.productSelect,
    });

    return formatProduct(product);
  }

  async findAll(
    listQueryDto: ProductListQueryDto,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const { page, limit, skip, search } = normalizeListQuery(listQueryDto);
    const where = buildProductWhereInput(listQueryDto, search);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: this.productSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return createPaginatedResponse(
      items.map((item) => formatProduct(item)),
      page,
      limit,
      total,
    );
  }

  async findOne(id: string): Promise<ProductDetailsResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: this.productDetailsSelect,
    });

    if (!product) {
      throw new AppException(404, 'products.errors.not_found');
    }

    return formatProductDetails(product);
  }

  async findBySku(sku: string): Promise<ProductDetailsResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      select: this.productDetailsSelect,
    });

    if (!product) {
      throw new AppException(404, 'products.errors.not_found');
    }

    return formatProductDetails(product);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        sku: true,
        categoryId: true,
      },
    });

    if (!product) {
      throw new AppException(404, 'products.errors.not_found');
    }

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const skuTaken = await this.prisma.product.findUnique({
        where: { sku: updateProductDto.sku },
        select: { id: true },
      });

      if (skuTaken) {
        throw new AppException(409, 'products.errors.sku_taken');
      }
    }

    if (
      updateProductDto.categoryId &&
      updateProductDto.categoryId !== product.categoryId
    ) {
      await this.ensureCategoryExists(updateProductDto.categoryId);
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        ...(updateProductDto.price
          ? { price: new Prisma.Decimal(updateProductDto.price) }
          : {}),
      },
      select: this.productSelect,
    });

    return formatProduct(updatedProduct);
  }

  async updateStock(
    id: string,
    updateProductStockDto: UpdateProductStockDto,
  ): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      throw new AppException(404, 'products.errors.not_found');
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        stock: updateProductStockDto.stock,
      },
      select: this.productSelect,
    });

    return formatProduct(updatedProduct);
  }

  async remove(id: string): Promise<null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      throw new AppException(404, 'products.errors.not_found');
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return null;
  }
}
