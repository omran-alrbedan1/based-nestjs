export const orderSelect = {
  id: true,
  orderNumber: true,
  userId: true,
  cartId: true,
  status: true,
  totalAmount: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const orderDetailsSelect = {
  ...orderSelect,
  orderItems: {
    select: {
      id: true,
      productId: true,
      quantity: true,
      price: true,
    },
  },
  shippingAddress: {
    select: {
      id: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  payment: {
    select: {
      id: true,
      amount: true,
      method: true,
      currency: true,
      transactionId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;
