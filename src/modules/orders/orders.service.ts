import { Injectable } from '@nestjs/common';
import { OrderStatus } from 'generated/prisma';
import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  createPaginatedResponse,
  normalizeListQuery,
} from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderListQueryDto } from './dto/order-list-query.dto';
import {
  OrderDetailsResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { formatOrder, formatOrderDetails } from './orders.mapper';
import {
  calculateOrderTotalAmount,
  assertProductsCanBeOrdered,
} from './orders.product-utils';
import { buildOrderWhereInput, isAdmin } from './orders.query-builder';
import { orderDetailsSelect, orderSelect } from './orders.selects';
import type { ResolvedOrderProduct } from './orders.types';
import {
  buildOrderItemsCreateData,
  buildOrderUpdateData,
  buildPaymentCreate,
  buildPaymentUpsertPayload,
  buildShippingAddressCreate,
  buildShippingAddressUpsertPayload,
} from './orders.builder';
import type { OrderDetailsRecord } from './orders.types';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCartForUser(
    cartId: string,
    userId: string,
  ): Promise<void> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: {
        id: true,
        userId: true,
        checkedOut: true,
      },
    });

    if (!cart) {
      throw new AppException(404, 'orders.errors.cart_not_found');
    }

    if (cart.userId !== userId) {
      throw new AppException(403, 'common.errors.forbidden');
    }

    if (cart.checkedOut) {
      throw new AppException(409, 'orders.errors.cart_already_checked_out');
    }
  }

  private async resolveProducts(
    items: CreateOrderDto['items'],
  ): Promise<Map<string, ResolvedOrderProduct>> {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        price: true,
        stock: true,
        isActive: true,
      },
    });

    const productsMap = new Map(
      products.map((product) => [product.id, product]),
    );
    assertProductsCanBeOrdered(items, productsMap);

    return productsMap;
  }

  async create(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderDetailsResponseDto> {
    await this.ensureCartForUser(createOrderDto.cartId, userId);
    const productsMap = await this.resolveProducts(createOrderDto.items);
    const totalAmount = calculateOrderTotalAmount(
      createOrderDto.items,
      productsMap,
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId,
          cartId: createOrderDto.cartId,
          totalAmount,
          status: OrderStatus.PENDING,
          orderItems: {
            create: buildOrderItemsCreateData(
              createOrderDto.items,
              productsMap,
            ),
          },
          ...(createOrderDto.shippingAddress
            ? {
                shippingAddress: {
                  create: buildShippingAddressCreate(
                    createOrderDto.shippingAddress,
                  ),
                },
              }
            : {}),
          ...(createOrderDto.payment
            ? {
                payment: {
                  create: buildPaymentCreate(
                    createOrderDto.payment,
                    userId,
                    totalAmount,
                  ),
                },
              }
            : {}),
        },
        select: orderDetailsSelect,
      });

      for (const item of createOrderDto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.cart.update({
        where: { id: createOrderDto.cartId },
        data: {
          checkedOut: true,
        },
      });

      return createdOrder;
    });

    return formatOrderDetails(order as OrderDetailsRecord);
  }

  async findAll(
    userId: string,
    role: string,
    listQueryDto: OrderListQueryDto,
  ): Promise<PaginatedResponseDto<OrderResponseDto>> {
    const { page, limit, skip, search } = normalizeListQuery(listQueryDto);
    const where = buildOrderWhereInput(userId, role, listQueryDto, search);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: orderSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return createPaginatedResponse(
      items.map((item) => formatOrder(item)),
      page,
      limit,
      total,
    );
  }

  async findOne(
    id: string,
    userId: string,
    role: string,
  ): Promise<OrderDetailsResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: orderDetailsSelect,
    });

    if (!order) {
      throw new AppException(404, 'orders.errors.not_found');
    }

    if (!isAdmin(role) && order.userId !== userId) {
      throw new AppException(403, 'common.errors.forbidden');
    }

    return formatOrderDetails(order);
  }

  async update(
    id: string,
    userId: string,
    role: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<OrderDetailsResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        totalAmount: true,
      },
    });

    if (!order) {
      throw new AppException(404, 'orders.errors.not_found');
    }

    const hasAdminRole = isAdmin(role);

    if (!hasAdminRole && order.userId !== userId) {
      throw new AppException(403, 'common.errors.forbidden');
    }

    if (!hasAdminRole) {
      if (
        updateOrderDto.shippingAddress ||
        updateOrderDto.payment ||
        updateOrderDto.status !== OrderStatus.CANCELLED
      ) {
        throw new AppException(403, 'orders.errors.user_can_only_cancel');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new AppException(
          409,
          'orders.errors.only_pending_can_be_updated',
        );
      }
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: buildOrderUpdateData(updateOrderDto),
      });

      if (hasAdminRole && updateOrderDto.shippingAddress) {
        const shippingAddressPayload = buildShippingAddressUpsertPayload(
          updateOrderDto.shippingAddress,
        );

        await tx.shippingAddress.upsert({
          where: { orderId: id },
          update: shippingAddressPayload.update,
          create: {
            orderId: id,
            ...shippingAddressPayload.create,
          },
        });
      }

      if (hasAdminRole && updateOrderDto.payment) {
        const paymentPayload = buildPaymentUpsertPayload(
          updateOrderDto.payment,
          order,
        );

        await tx.payment.upsert({
          where: { orderId: id },
          update: paymentPayload.update,
          create: {
            orderId: id,
            ...paymentPayload.create,
          },
        });
      }

      return tx.order.findUnique({
        where: { id },
        select: orderDetailsSelect,
      });
    });

    if (!updatedOrder) {
      throw new AppException(404, 'orders.errors.not_found');
    }

    return formatOrderDetails(updatedOrder as OrderDetailsRecord);
  }

  async remove(id: string): Promise<null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!order) {
      throw new AppException(404, 'orders.errors.not_found');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new AppException(
        409,
        'orders.errors.completed_order_cannot_be_deleted',
      );
    }

    await this.prisma.order.delete({
      where: { id },
    });

    return null;
  }
}
