import * as bcrypt from 'bcrypt';
import { Role } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from './users.service';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user-dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

type UsersPrismaMock = {
  user: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: UsersPrismaMock;

  const hashMock = bcrypt.hash as jest.Mock;
  const compareMock = bcrypt.compare as jest.Mock;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new UsersService(prisma as unknown as PrismaService);
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

  it('returns a paginated user list', async () => {
    const createdAt = new Date('2026-08-26T00:00:00.000Z');
    prisma.$transaction.mockResolvedValue([
      [
        {
          id: '1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'USER',
          createdAt,
          updatedAt: createdAt,
        },
      ],
      1,
    ]);

    const result = await service.findAll({
      page: 1,
      limit: 10,
      search: 'john',
    });

    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects profile updates when the email is already taken', async () => {
    const updateUserDto: UpdateUserDto = {
      id: '1',
      email: 'new@example.com',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date('2026-08-26T00:00:00.000Z'),
      updatedAt: new Date('2026-08-26T00:00:00.000Z'),
    };

    prisma.user.findUnique
      .mockResolvedValueOnce({
        firstName: 'John',
        lastName: 'Doe',
        email: 'old@example.com',
      })
      .mockResolvedValueOnce({ id: 'another-user' });

    await expectAppException(
      service.update('user-1', updateUserDto),
      409,
      'users.errors.email_taken',
    );
  });

  it('rejects password updates when the current password is wrong', async () => {
    const updatePasswordDto: UpdatePasswordDto = {
      currentPassword: 'WrongPassword123!',
      newPassword: 'NewPassword123!',
    };

    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      password: 'stored-hash',
    });
    compareMock.mockResolvedValue(false);

    await expectAppException(
      service.updatePassword('user-1', updatePasswordDto),
      401,
      'auth.errors.current_password_incorrect',
    );
  });

  it('updates the password and clears the refresh token', async () => {
    const updatePasswordDto: UpdatePasswordDto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    };

    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      password: 'stored-hash',
    });
    prisma.user.update.mockResolvedValue(undefined);
    compareMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    hashMock.mockResolvedValue('new-password-hash');

    const result = await service.updatePassword('user-1', updatePasswordDto);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        password: 'new-password-hash',
        refreshToken: null,
      },
    });
    expect(result).toEqual({ message: 'password changed successfully' });
  });

  it('creates an employee with normalized email and forces the ADMIN role', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 12,
      firstName: 'Ahmad',
      lastName: 'Ali',
      email: 'ahmad@example.com',
      role: Role.ADMIN,
      isActive: true,
      createdAt: new Date('2026-09-13T00:00:00.000Z'),
      updatedAt: new Date('2026-09-13T00:00:00.000Z'),
    });
    hashMock.mockResolvedValue('hashed-password');

    const result = await service.createEmployee({
      firstName: ' Ahmad ',
      lastName: ' Ali ',
      email: '  Ahmad@Example.COM ',
      password: 'StrongPass123!',
    });

    expect(hashMock).toHaveBeenCalledWith('StrongPass123!', 12);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          firstName: 'Ahmad',
          lastName: 'Ali',
          email: 'ahmad@example.com',
          password: 'hashed-password',
          role: Role.ADMIN,
          isActive: true,
        },
      }),
    );
    expect(result.role).toBe(Role.ADMIN);
    expect(result.isActive).toBe(true);
    expect((result as Record<string, unknown>).password).toBeUndefined();
  });

  it('rejects creating an employee with a duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 7 });

    await expectAppException(
      service.createEmployee({
        firstName: 'Ahmad',
        lastName: 'Ali',
        email: 'ahmad@example.com',
        password: 'StrongPass123!',
      }),
      409,
      'users.errors.email_taken',
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('activates a user idempotently', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 12 });
    prisma.user.update.mockResolvedValue({ id: 12, isActive: true });

    const result = await service.activate(12);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { isActive: true },
      select: expect.anything(),
    });
    expect(result.isActive).toBe(true);
  });

  it('throws not found when activating an unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expectAppException(service.activate(999), 404, 'users.errors.not_found');
  });

  it('deactivates a user and clears its refresh token', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 12 });
    prisma.user.update.mockResolvedValue({ id: 12, isActive: false });

    const result = await service.deactivate(12, 1);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { isActive: false, refreshToken: null },
      select: expect.anything(),
    });
    expect(result.isActive).toBe(false);
  });

  it('prevents a user from deactivating itself', async () => {
    await expectAppException(service.deactivate(5, 5), 400, 'users.errors.cannot_deactivate_self');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('throws not found when deactivating an unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expectAppException(service.deactivate(999, 1), 404, 'users.errors.not_found');
  });

  it('updates a managed user with explicit field mapping and normalized email', async () => {
    const updateUserDto: UpdateUserDto = {
      email: '  NEW@Example.COM ',
      firstName: ' NewName ',
      lastName: null,
    };

    prisma.user.findUnique.mockResolvedValueOnce({ id: 12, email: 'old@example.com' });
    prisma.user.update.mockResolvedValue({
      id: 12,
      email: 'new@example.com',
      firstName: 'NewName',
      lastName: null,
    });

    const result = await service.updateManagedUser(12, updateUserDto);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: {
        firstName: 'NewName',
        lastName: null,
        email: 'new@example.com',
      },
      select: expect.anything(),
    });
    expect(result.email).toBe('new@example.com');
  });

  it('rejects a managed update when the email is taken', async () => {
    const updateUserDto: UpdateUserDto = {
      email: 'taken@example.com',
      firstName: 'Ahmad',
      lastName: 'Ali',
    };

    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 12, email: 'old@example.com' })
      .mockResolvedValueOnce({ id: 20 });

    await expectAppException(
      service.updateManagedUser(12, updateUserDto),
      409,
      'users.errors.email_taken',
    );
  });

  it('filters the user list by isActive and role', async () => {
    const createdAt = new Date('2026-09-13T00:00:00.000Z');
    prisma.$transaction.mockResolvedValue([
      [
        {
          id: 12,
          email: 'ahmad@example.com',
          firstName: 'Ahmad',
          lastName: 'Ali',
          role: Role.ADMIN,
          isActive: true,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      1,
    ]);

    await service.findAll({ page: 1, limit: 10, isActive: true, role: Role.ADMIN });

    const [findManyArgs, countArgs] = prisma.$transaction.mock.calls[0];
    expect(findManyArgs.where).toEqual({ isActive: true, role: Role.ADMIN });
    expect(countArgs.where).toEqual({ isActive: true, role: Role.ADMIN });
  });
});
