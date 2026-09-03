import { Prisma } from 'generated/prisma/client';

export type ProductListRecord = {
  id: string;
  name: string;
  description: string | null;
  price: Prisma.Decimal;
  stock: number;
  sku: string;
  imageUrl: string | null;
  isActive: boolean;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductDetailsRecord = ProductListRecord & {
  category: {
    id: string;
    name: string;
    slug: string;
  };
};
