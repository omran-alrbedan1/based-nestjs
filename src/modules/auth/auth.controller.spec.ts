import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppException } from 'src/common/exceptions/app.exception';
import { configureHttpTestApp, httpTestI18nImports } from 'src/test-utils/http-test-app';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenGuard } from './guard/refresh-token.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: request.headers['x-test-user-id'] ?? 'user-1',
      role: request.headers['x-test-role'] ?? 'USER',
    };

    return true;
  }
}

class TestRefreshTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: request.headers['x-test-user-id'] ?? 'user-1',
      role: request.headers['x-test-role'] ?? 'USER',
    };

    return true;
  }
}

describe('AuthController (HTTP)', () => {
  let app: INestApplication;

  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [...httpTestI18nImports],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .overrideGuard(RefreshTokenGuard)
      .useClass(TestRefreshTokenGuard)
      .compile();

    app = await configureHttpTestApp(moduleRef.createNestApplication());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getServer = () => app.getHttpServer() as Parameters<typeof request>[0];

  it('returns the translated success envelope for register', async () => {
    const createdAt = new Date('2026-08-26T00:00:00.000Z').toISOString();
    authService.register.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: '1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        createdAt,
        updatedAt: createdAt,
      },
    });

    const response = await request(getServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'john@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      statusCode: 201,
      message: 'User registered successfully.',
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          email: 'john@example.com',
        },
      },
    });
  });

  it('returns translated validation errors from the global pipe', async () => {
    const response = await request(getServer())
      .post('/api/v1/auth/login')
      .set('Accept-Language', 'ar')
      .send({
        email: 'invalid-email',
        password: 'weak',
        extra: 'not-allowed',
      })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toBe('فشل التحقق من صحة البيانات.');
    expect(response.body.error.code).toBe('validation.invalid_input');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'extra',
        }),
      ]),
    );
  });

  it('translates service exceptions through the global exception filter', async () => {
    authService.login.mockRejectedValue(new AppException(401, 'auth.errors.invalid_credentials'));

    const response = await request(getServer())
      .post('/api/v1/auth/login')
      .set('Accept-Language', 'ar')
      .send({
        email: 'john@example.com',
        password: 'Password123!',
      })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
      error: {
        code: 'auth.errors.invalid_credentials',
      },
    });
  });

  it('refreshes tokens through the guard-populated user context', async () => {
    authService.refreshTokens.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: {
        id: 'user-77',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        createdAt: new Date('2026-08-26T00:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-08-26T00:00:00.000Z').toISOString(),
      },
    });

    const response = await request(getServer())
      .post('/api/v1/auth/refresh')
      .set('x-test-user-id', 'user-77')
      .expect(200);

    expect(authService.refreshTokens).toHaveBeenCalledWith('user-77');
    expect(response.body.message).toBe('Tokens refreshed successfully.');
  });
});
