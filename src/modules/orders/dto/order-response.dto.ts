export class OrderItemResponseDto {
  id!: string;
  productId!: string;
  quantity!: number;
  price!: string;
}

export class ShippingAddressResponseDto {
  id!: string;
  addressLine1!: string;
  addressLine2!: string | null;
  city!: string;
  state!: string;
  postalCode!: string;
  country!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaymentResponseDto {
  id!: string;
  amount!: string;
  method!: string;
  currency!: string;
  transactionId!: string | null;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class OrderResponseDto {
  id!: string;
  orderNumber!: string;
  userId!: string;
  cartId!: string;
  status!: string;
  totalAmount!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class OrderDetailsResponseDto extends OrderResponseDto {
  orderItems!: OrderItemResponseDto[];
  shippingAddress!: ShippingAddressResponseDto | null;
  payment!: PaymentResponseDto | null;
}
