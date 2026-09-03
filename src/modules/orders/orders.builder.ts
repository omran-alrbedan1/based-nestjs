import { OrderStatus, PaymentStatus, Prisma } from 'generated/prisma';
import {
  CreateOrderDto,
  PaymentInputDto,
  ShippingAddressInputDto,
} from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import type { ResolvedOrderProduct } from './orders.types';

export function buildShippingAddressCreate(
  shippingAddress?: ShippingAddressInputDto,
): Prisma.ShippingAddressCreateWithoutOrderInput | undefined {
  if (!shippingAddress) {
    return undefined;
  }

  return {
    addressLine1: shippingAddress.addressLine1,
    addressLine2: shippingAddress.addressLine2,
    city: shippingAddress.city,
    state: shippingAddress.state,
    postalCode: shippingAddress.postalCode,
    country: shippingAddress.country,
  };
}

export function buildPaymentCreate(
  payment: PaymentInputDto | undefined,
  userId: string,
  amount: Prisma.Decimal,
): Prisma.PaymentCreateWithoutOrderInput | undefined {
  if (!payment) {
    return undefined;
  }

  return {
    user: {
      connect: {
        id: userId,
      },
    },
    amount,
    method: payment.method,
    currency: payment.currency ?? 'usd',
    transactionId: payment.transactionId,
    status: PaymentStatus.PENDING,
  };
}

export function buildOrderItemsCreateData(
  items: CreateOrderDto['items'],
  productsMap: Map<string, ResolvedOrderProduct>,
): Prisma.OrderItemUncheckedCreateWithoutOrderInput[] {
  return items.map((item) => {
    const product = productsMap.get(item.productId);

    if (!product) {
      throw new Error(`Missing resolved product for ${item.productId}`);
    }

    return {
      productId: item.productId,
      quantity: item.quantity,
      price: product.price,
    };
  });
}

export function buildOrderUpdateData(
  updateOrderDto: UpdateOrderDto,
): Prisma.OrderUpdateInput {
  return {
    ...(updateOrderDto.status
      ? { status: updateOrderDto.status as OrderStatus }
      : {}),
  };
}

export function buildShippingAddressUpsertPayload(
  shippingAddress: ShippingAddressInputDto,
) {
  return {
    update: {
      addressLine1: shippingAddress.addressLine1,
      addressLine2: shippingAddress.addressLine2,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country,
    },
    create: {
      addressLine1: shippingAddress.addressLine1,
      addressLine2: shippingAddress.addressLine2,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country,
    },
  };
}

export function buildPaymentUpsertPayload(
  payment: NonNullable<UpdateOrderDto['payment']>,
  order: { userId: string; totalAmount: Prisma.Decimal },
) {
  return {
    update: {
      ...(payment.method ? { method: payment.method } : {}),
      ...(payment.currency ? { currency: payment.currency } : {}),
      ...(payment.transactionId !== undefined
        ? { transactionId: payment.transactionId }
        : {}),
      ...(payment.status ? { status: payment.status as PaymentStatus } : {}),
    },
    create: {
      userId: order.userId,
      amount: order.totalAmount,
      method: payment.method ?? 'manual',
      currency: payment.currency ?? 'usd',
      transactionId: payment.transactionId,
      status:
        (payment.status as PaymentStatus | undefined) ?? PaymentStatus.PENDING,
    },
  };
}
