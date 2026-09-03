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
import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductDetailsResponseDto, ProductResponseDto } from './dto/product-response.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStockDto } from './dto/update-product-stock.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('products.responses.product_created')
  async create(@Body() createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    return await this.productsService.create(createProductDto);
  }

  @Get()
  @ResponseMessage('products.responses.list_retrieved')
  async findAll(
    @Query() listQueryDto: ProductListQueryDto,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    return await this.productsService.findAll(listQueryDto);
  }

  @Get('sku/:sku')
  @ResponseMessage('products.responses.product_retrieved')
  async findBySku(@Param('sku') sku: string): Promise<ProductDetailsResponseDto> {
    return await this.productsService.findBySku(sku);
  }

  @Get(':id')
  @ResponseMessage('products.responses.product_retrieved')
  async findOne(@Param('id') id: string): Promise<ProductDetailsResponseDto> {
    return await this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('products.responses.product_updated')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return await this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('products.responses.product_stock_updated')
  async updateStock(
    @Param('id') id: string,
    @Body() updateProductStockDto: UpdateProductStockDto,
  ): Promise<ProductResponseDto> {
    return await this.productsService.updateStock(id, updateProductStockDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ResponseMessage('products.responses.product_deleted')
  async remove(@Param('id') id: string): Promise<null> {
    return await this.productsService.remove(id);
  }
}
