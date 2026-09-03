import { Prisma } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductStockDto } from './dto/update-product-stock.dto';

type ProductsPrismaMock = {
  product: {
    findUnique: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  category: {
    findUnique: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: ProductsPrismaMock;

  beforeEach(() => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new ProductsService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  async function expectAppException(
    promise: Promise<unknown>,
    statusCode: number,
    translationKey: string,
  ): Promise<void> {
    expect.assertions(3);

    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getStatusCode()).toBe(statusCode);
      expect((error as AppException).getTranslationKey()).toBe(translationKey);
    }
  }

  it('creates a product and normalizes decimal price to string in the response', async () => {
    const createProductDto: CreateProductDto = {
      name: 'Laptop',
      description: 'High-end laptop',
      price: '1999.99',
      stock: 5,
      sku: 'LAPTOP-001',
      categoryId: 'category-1',
      isActive: true,
    };

    const createdAt = new Date('2026-08-26T00:00:00.000Z');
    prisma.product.findUnique.mockResolvedValueOnce(null);
    prisma.category.findUnique.mockResolvedValue({ id: 'category-1' });
    prisma.product.create.mockResolvedValue({
      id: '1',
      name: 'Laptop',
      description: 'High-end laptop',
      price: new Prisma.Decimal('1999.99'),
      stock: 5,
      sku: 'LAPTOP-001',
      imageUrl: null,
      isActive: true,
      categoryId: 'category-1',
      createdAt,
      updatedAt: createdAt,
    });

    const result = await service.create(createProductDto);

    expect(result.price).toBe('1999.99');
    expect(prisma.product.create).toHaveBeenCalled();
  });

  it('rejects product creation when the sku is already taken', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'existing-product' });

    await expectAppException(
      service.create({
        name: 'Laptop',
        price: '1999.99',
        stock: 5,
        sku: 'LAPTOP-001',
        categoryId: 'category-1',
      }),
      409,
      'products.errors.sku_taken',
    );
  });

  it('rejects product creation when the category does not exist', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.category.findUnique.mockResolvedValue(null);

    await expectAppException(
      service.create({
        name: 'Laptop',
        price: '1999.99',
        stock: 5,
        sku: 'LAPTOP-001',
        categoryId: 'missing-category',
      }),
      404,
      'products.errors.category_not_found',
    );
  });

  it('updates product stock after verifying that the product exists', async () => {
    const createdAt = new Date('2026-08-26T00:00:00.000Z');
    const updateStockDto: UpdateProductStockDto = {
      stock: 12,
    };

    prisma.product.findUnique.mockResolvedValueOnce({ id: '1' });
    prisma.product.update.mockResolvedValue({
      id: '1',
      name: 'Laptop',
      description: 'High-end laptop',
      price: new Prisma.Decimal('1999.99'),
      stock: 12,
      sku: 'LAPTOP-001',
      imageUrl: null,
      isActive: true,
      categoryId: 'category-1',
      createdAt,
      updatedAt: createdAt,
    });

    const result = await service.updateStock('1', updateStockDto);

    expect(result.stock).toBe(12);
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: {
        stock: 12,
      },
      select: expect.any(Object),
    });
  });
});
