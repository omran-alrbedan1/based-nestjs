import { Prisma } from 'generated/prisma';
import { AppException } from 'src/common/exceptions/app.exception';
import { CreateOrderDto } from './dto/create-order.dto';
import type { ResolvedOrderProduct } from './orders.types';

export function assertProductsCanBeOrdered(
  items: CreateOrderDto['items'],
  productsMap: Map<string, ResolvedOrderProduct>,
): void {
  for (const item of items) {
    const product = productsMap.get(item.productId);

    if (!product) {
      throw new AppException(404, 'orders.errors.product_not_found');
    }

    if (!product.isActive) {
      throw new AppException(409, 'orders.errors.product_inactive');
    }

    if (product.stock < item.quantity) {
      throw new AppException(409, 'orders.errors.insufficient_stock');
    }
  }
}

export function calculateOrderTotalAmount(
  items: CreateOrderDto['items'],
  productsMap: Map<string, ResolvedOrderProduct>,
): Prisma.Decimal {
  return items.reduce((sum, item) => {
    const product = productsMap.get(item.productId);

    if (!product) {
      throw new AppException(404, 'orders.errors.product_not_found');
    }

    return sum.plus(product.price.mul(item.quantity));
  }, new Prisma.Decimal(0));
}
