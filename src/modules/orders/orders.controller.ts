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
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { moderateThrottle } from 'src/common/decorators/custom-throttler.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { ResponseMessage } from 'src/utils/transform.interceptor';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderListQueryDto } from './dto/order-list-query.dto';
import { OrderDetailsResponseDto, OrderResponseDto } from './dto/order-response.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@moderateThrottle()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ResponseMessage('orders.responses.order_created')
  async create(
    @GetUser('id') userId: string,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderDetailsResponseDto> {
    return await this.ordersService.create(userId, createOrderDto);
  }

  @Get()
  @ResponseMessage('orders.responses.list_retrieved')
  async findAll(
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @Query() listQueryDto: OrderListQueryDto,
  ): Promise<PaginatedResponseDto<OrderResponseDto>> {
    return await this.ordersService.findAll(userId, role, listQueryDto);
  }

  @Get(':id')
  @ResponseMessage('orders.responses.order_retrieved')
  async findOne(
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @Param('id') id: string,
  ): Promise<OrderDetailsResponseDto> {
    return await this.ordersService.findOne(id, userId, role);
  }

  @Patch(':id')
  @ResponseMessage('orders.responses.order_updated')
  async update(
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<OrderDetailsResponseDto> {
    return await this.ordersService.update(id, userId, role, updateOrderDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('orders.responses.order_deleted')
  async remove(@Param('id') id: string): Promise<null> {
    return await this.ordersService.remove(id);
  }
}
