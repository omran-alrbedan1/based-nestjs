export type CategoryListRecord = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryDetailsRecord = CategoryListRecord & {
  _count: {
    products: number;
  };
};
