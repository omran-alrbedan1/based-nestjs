import { OrderStatus, PaymentStatus, Prisma } from 'generated/prisma';

export type OrderListRecord = {
  id: string;
  orderNumber: string;
  userId: string;
  cartId: string;
  status: OrderStatus;
  totalAmount: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderDetailsRecord = OrderListRecord & {
  orderItems: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: Prisma.Decimal;
  }>;
  shippingAddress: null | {
    id: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    createdAt: Date;
    updatedAt: Date;
  };
  payment: null | {
    id: string;
    amount: Prisma.Decimal;
    method: string;
    currency: string;
    transactionId: string | null;
    status: PaymentStatus;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type ResolvedOrderProduct = {
  id: string;
  price: Prisma.Decimal;
  stock: number;
  isActive: boolean;
};
