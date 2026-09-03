import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/auth.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

type AuthPrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

type JwtServiceMock = {
  signAsync: jest.Mock;
};

type ConfigServiceMock = {
  get: jest.Mock;
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: AuthPrismaMock;
  let jwtService: JwtServiceMock;
  let configService: ConfigServiceMock;

  const hashMock = bcrypt.hash as jest.Mock;
  const compareMock = bcrypt.compare as jest.Mock;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
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

  it('registers a new user, generates tokens, and stores the refresh token hash', async () => {
    const registerDto: RegisterDto = {
      email: 'john@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    const createdUser = {
      id: '1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      createdAt: new Date('2026-08-26T00:00:00.000Z'),
      updatedAt: new Date('2026-08-26T00:00:00.000Z'),
    };

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(createdUser);
    prisma.user.update.mockResolvedValue(undefined);
    configService.get.mockReturnValue('refresh-secret');
    hashMock.mockResolvedValueOnce('hashed-password').mockResolvedValueOnce('hashed-refresh-token');
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.register(registerDto);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: registerDto.email,
        password: 'hashed-password',
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: createdUser.id },
      data: { refreshToken: 'hashed-refresh-token' },
    });
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: createdUser,
    });
  });

  it('rejects duplicate registration attempts', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expectAppException(
      service.register({
        email: 'john@example.com',
        password: 'Password123!',
      }),
      409,
      'auth.errors.email_already_exists',
    );
  });

  it('throws unauthorized when login credentials are invalid', async () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'WrongPassword123!',
    };

    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: loginDto.email,
      password: 'stored-hash',
    });
    compareMock.mockResolvedValue(false);

    await expectAppException(service.login(loginDto), 401, 'auth.errors.invalid_credentials');
  });

  it('logs a user in and returns the normalized auth response', async () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'Password123!',
    };

    const user = {
      id: '1',
      email: loginDto.email,
      password: 'stored-hash',
      firstName: 'John',
      lastName: 'Doe',
      role: 'ADMIN',
      createdAt: new Date('2026-08-26T00:00:00.000Z'),
      updatedAt: new Date('2026-08-26T00:00:00.000Z'),
    };

    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(undefined);
    configService.get.mockReturnValue('refresh-secret');
    compareMock.mockResolvedValue(true);
    hashMock.mockResolvedValue('hashed-refresh-token');
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login(loginDto);

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { refreshToken: 'hashed-refresh-token' },
    });
  });

  it('rejects refresh token requests for unknown users', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expectAppException(
      service.refreshTokens('missing-user'),
      401,
      'auth.errors.invalid_refresh_token',
    );
  });
});
