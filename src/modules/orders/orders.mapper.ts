import {
  OrderDetailsResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';
import { OrderDetailsRecord, OrderListRecord } from './orders.types';

export function formatOrder(order: OrderListRecord): OrderResponseDto {
  return {
    ...order,
    totalAmount: order.totalAmount.toString(),
  };
}

export function formatOrderDetails(
  order: OrderDetailsRecord,
): OrderDetailsResponseDto {
  return {
    ...formatOrder(order),
    orderItems: order.orderItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price.toString(),
    })),
    shippingAddress: order.shippingAddress,
    payment: order.payment
      ? {
          ...order.payment,
          amount: order.payment.amount.toString(),
        }
      : null,
  };
}
