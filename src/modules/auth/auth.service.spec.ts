import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwtService = { signAsync: jest.fn() };
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return values[key];
    }),
  };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('rejects login for inactive staff', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'staff@example.com',
      password: 'stored-hash',
      isActive: false,
    });

    await expect(
      service.login({
        email: 'staff@example.com',
        password: 'Password123!',
      }),
    ).rejects.toMatchObject<AppException>({
      getStatusCode: expect.any(Function),
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('logs active staff in and rotates the refresh token', async () => {
    const timestamp = new Date('2026-08-26T00:00:00.000Z');
    const user = {
      id: 'user-1',
      email: 'staff@example.com',
      password: 'stored-hash',
      firstName: 'Garage',
      lastName: 'Admin',
      role: 'ADMIN',
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    prisma.user.findUnique.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    await expect(
      service.login({
        email: user.email,
        password: 'Password123!',
      }),
    ).resolves.toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: user.id, role: 'ADMIN' },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { refreshToken: 'hashed-refresh-token' },
    });
  });

  it('rejects refresh for inactive staff', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      isActive: false,
    });

    await expect(service.refreshTokens('user-1')).rejects.toBeInstanceOf(AppException);
  });
});
