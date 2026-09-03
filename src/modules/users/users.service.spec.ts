import * as bcrypt from 'bcrypt';
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
});
