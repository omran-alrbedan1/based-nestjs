require('dotenv/config');

const bcrypt = require('bcrypt');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient, Prisma, Role, OrderStatus, PaymentStatus } = require('../generated/prisma');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;

const seedIds = {
  adminUserId: '11111111-1111-1111-1111-111111111111',
  customerUserId: '22222222-2222-2222-2222-222222222222',
  shopperUserId: '33333333-3333-3333-3333-333333333333',
  electronicsCategoryId: '44444444-4444-4444-4444-444444444444',
  booksCategoryId: '55555555-5555-5555-5555-555555555555',
  phoneProductId: '66666666-6666-6666-6666-666666666666',
  headphonesProductId: '77777777-7777-7777-7777-777777777777',
  bookProductId: '88888888-8888-8888-8888-888888888888',
  shopperCartId: '99999999-9999-9999-9999-999999999999',
  customerCartId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  shopperCartItemId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  customerOrderId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  customerOrderItemId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  customerShippingAddressId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  customerPaymentId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
};

async function upsertUsers() {
  const adminPassword = await bcrypt.hash('AdminPassword@123', SALT_ROUNDS);
  const customerPassword = await bcrypt.hash('CustomerPassword@123', SALT_ROUNDS);
  const shopperPassword = await bcrypt.hash('ShopperPassword@123', SALT_ROUNDS);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
      password: adminPassword,
      refreshToken: null,
    },
    create: {
      id: seedIds.adminUserId,
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {
      firstName: 'Order',
      lastName: 'Customer',
      role: Role.USER,
      password: customerPassword,
      refreshToken: null,
    },
    create: {
      id: seedIds.customerUserId,
      email: 'customer@example.com',
      password: customerPassword,
      firstName: 'Order',
      lastName: 'Customer',
      role: Role.USER,
    },
  });

  await prisma.user.upsert({
    where: { email: 'shopper@example.com' },
    update: {
      firstName: 'Cart',
      lastName: 'Shopper',
      role: Role.USER,
      password: shopperPassword,
      refreshToken: null,
    },
    create: {
      id: seedIds.shopperUserId,
      email: 'shopper@example.com',
      password: shopperPassword,
      firstName: 'Cart',
      lastName: 'Shopper',
      role: Role.USER,
    },
  });
}

async function upsertCategories() {
  await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {
      name: 'Electronics',
      description: 'Phones, gadgets, and accessories.',
      imageUrl: 'https://example.com/images/categories/electronics.jpg',
      isActive: true,
    },
    create: {
      id: seedIds.electronicsCategoryId,
      name: 'Electronics',
      slug: 'electronics',
      description: 'Phones, gadgets, and accessories.',
      imageUrl: 'https://example.com/images/categories/electronics.jpg',
      isActive: true,
    },
  });

  await prisma.category.upsert({
    where: { slug: 'books' },
    update: {
      name: 'Books',
      description: 'Printed and digital reading materials.',
      imageUrl: 'https://example.com/images/categories/books.jpg',
      isActive: true,
    },
    create: {
      id: seedIds.booksCategoryId,
      name: 'Books',
      slug: 'books',
      description: 'Printed and digital reading materials.',
      imageUrl: 'https://example.com/images/categories/books.jpg',
      isActive: true,
    },
  });
}

async function upsertProducts() {
  await prisma.product.upsert({
    where: { sku: 'SEED-PHONE-001' },
    update: {
      name: 'Seed Smartphone',
      description: 'Flagship smartphone seeded for local development.',
      price: new Prisma.Decimal('899.99'),
      stock: 25,
      imageUrl: 'https://example.com/images/products/seed-smartphone.jpg',
      isActive: true,
      categoryId: seedIds.electronicsCategoryId,
    },
    create: {
      id: seedIds.phoneProductId,
      name: 'Seed Smartphone',
      description: 'Flagship smartphone seeded for local development.',
      price: new Prisma.Decimal('899.99'),
      stock: 25,
      sku: 'SEED-PHONE-001',
      imageUrl: 'https://example.com/images/products/seed-smartphone.jpg',
      isActive: true,
      categoryId: seedIds.electronicsCategoryId,
    },
  });

  await prisma.product.upsert({
    where: { sku: 'SEED-HEADPHONES-001' },
    update: {
      name: 'Seed Headphones',
      description: 'Noise-cancelling headphones for seeded cart data.',
      price: new Prisma.Decimal('199.50'),
      stock: 40,
      imageUrl: 'https://example.com/images/products/seed-headphones.jpg',
      isActive: true,
      categoryId: seedIds.electronicsCategoryId,
    },
    create: {
      id: seedIds.headphonesProductId,
      name: 'Seed Headphones',
      description: 'Noise-cancelling headphones for seeded cart data.',
      price: new Prisma.Decimal('199.50'),
      stock: 40,
      sku: 'SEED-HEADPHONES-001',
      imageUrl: 'https://example.com/images/products/seed-headphones.jpg',
      isActive: true,
      categoryId: seedIds.electronicsCategoryId,
    },
  });

  await prisma.product.upsert({
    where: { sku: 'SEED-BOOK-001' },
    update: {
      name: 'Seed Backend Book',
      description: 'Reference book used for seeded order history.',
      price: new Prisma.Decimal('59.00'),
      stock: 80,
      imageUrl: 'https://example.com/images/products/seed-book.jpg',
      isActive: true,
      categoryId: seedIds.booksCategoryId,
    },
    create: {
      id: seedIds.bookProductId,
      name: 'Seed Backend Book',
      description: 'Reference book used for seeded order history.',
      price: new Prisma.Decimal('59.00'),
      stock: 80,
      sku: 'SEED-BOOK-001',
      imageUrl: 'https://example.com/images/products/seed-book.jpg',
      isActive: true,
      categoryId: seedIds.booksCategoryId,
    },
  });
}

async function upsertCartsAndCartItems() {
  await prisma.cart.upsert({
    where: { userId: seedIds.shopperUserId },
    update: {
      checkedOut: false,
    },
    create: {
      id: seedIds.shopperCartId,
      userId: seedIds.shopperUserId,
      checkedOut: false,
    },
  });

  await prisma.cart.upsert({
    where: { userId: seedIds.customerUserId },
    update: {
      checkedOut: true,
    },
    create: {
      id: seedIds.customerCartId,
      userId: seedIds.customerUserId,
      checkedOut: true,
    },
  });

  await prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: seedIds.shopperCartId,
        productId: seedIds.headphonesProductId,
      },
    },
    update: {
      quantity: 2,
    },
    create: {
      id: seedIds.shopperCartItemId,
      cartId: seedIds.shopperCartId,
      productId: seedIds.headphonesProductId,
      quantity: 2,
    },
  });
}

async function upsertOrdersAndDependents() {
  await prisma.order.upsert({
    where: { orderNumber: 'SEED-ORDER-001' },
    update: {
      userId: seedIds.customerUserId,
      cartId: seedIds.customerCartId,
      status: OrderStatus.COMPLETED,
      totalAmount: new Prisma.Decimal('958.99'),
    },
    create: {
      id: seedIds.customerOrderId,
      orderNumber: 'SEED-ORDER-001',
      userId: seedIds.customerUserId,
      cartId: seedIds.customerCartId,
      status: OrderStatus.COMPLETED,
      totalAmount: new Prisma.Decimal('958.99'),
    },
  });

  await prisma.orderItem.upsert({
    where: { id: seedIds.customerOrderItemId },
    update: {
      orderId: seedIds.customerOrderId,
      productId: seedIds.phoneProductId,
      quantity: 1,
      price: new Prisma.Decimal('899.99'),
    },
    create: {
      id: seedIds.customerOrderItemId,
      orderId: seedIds.customerOrderId,
      productId: seedIds.phoneProductId,
      quantity: 1,
      price: new Prisma.Decimal('899.99'),
    },
  });

  await prisma.shippingAddress.upsert({
    where: { orderId: seedIds.customerOrderId },
    update: {
      addressLine1: '123 Seed Street',
      addressLine2: 'Suite 5',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'USA',
    },
    create: {
      id: seedIds.customerShippingAddressId,
      orderId: seedIds.customerOrderId,
      addressLine1: '123 Seed Street',
      addressLine2: 'Suite 5',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'USA',
    },
  });

  await prisma.payment.upsert({
    where: { orderId: seedIds.customerOrderId },
    update: {
      userId: seedIds.customerUserId,
      amount: new Prisma.Decimal('958.99'),
      method: 'credit_card',
      currency: 'usd',
      transactionId: 'seed-transaction-001',
      status: PaymentStatus.PAID,
    },
    create: {
      id: seedIds.customerPaymentId,
      orderId: seedIds.customerOrderId,
      userId: seedIds.customerUserId,
      amount: new Prisma.Decimal('958.99'),
      method: 'credit_card',
      currency: 'usd',
      transactionId: 'seed-transaction-001',
      status: PaymentStatus.PAID,
    },
  });
}

async function main() {
  console.log('Starting database seed...');

  await upsertUsers();
  await upsertCategories();
  await upsertProducts();
  await upsertCartsAndCartItems();
  await upsertOrdersAndDependents();

  console.log('Database seed completed successfully.');
  console.log('Seeded users: admin@example.com, customer@example.com, shopper@example.com');
  console.log('Seeded categories: electronics, books');
  console.log('Seeded products: SEED-PHONE-001, SEED-HEADPHONES-001, SEED-BOOK-001');
  console.log('Seeded order: SEED-ORDER-001');
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
