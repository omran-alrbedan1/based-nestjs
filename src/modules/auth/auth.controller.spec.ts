import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { configureHttpTestApp, httpTestI18nImports } from 'src/test-utils/http-test-app';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenGuard } from './guard/refresh-token.guard';

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().user = {
      id: 'user-1',
      role: 'ADMIN',
    };
    return true;
  }
}

describe('AuthController (HTTP)', () => {
  let app: INestApplication;
  const authService = {
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
      .useClass(TestAuthGuard)
      .overrideGuard(RefreshTokenGuard)
      .useClass(TestAuthGuard)
      .compile();

    app = await configureHttpTestApp(moduleRef.createNestApplication());
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('does not expose public staff registration', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/register').send({}).expect(404);
  });

  it('logs staff in through the existing authentication flow', async () => {
    const now = new Date('2026-08-26T00:00:00.000Z');
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'staff@example.com',
        firstName: 'Garage',
        lastName: 'Admin',
        role: 'ADMIN',
        createdAt: now,
        updatedAt: now,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'staff@example.com',
        password: 'Password123!',
      })
      .expect(200);

    expect(response.body.data.user.role).toBe('ADMIN');
  });
});
