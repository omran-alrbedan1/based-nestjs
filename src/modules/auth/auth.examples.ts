import { HttpStatus } from '@nestjs/common';

export const authSuccessExamples = {
  register: {
    accessToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
    refreshToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      firstName: 'Ahmed',
      lastName: 'Mohamed',
      role: 'user',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  },
  login: {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      firstName: 'Ahmed',
      lastName: 'Mohamed',
      role: 'user',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  },
  refresh: {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      firstName: 'Ahmed',
      lastName: 'Mohamed',
      role: 'user',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  },
};

// ✅ أمثلة الأخطاء
export const authErrorExamples = {
  badRequest: {
    statusCode: HttpStatus.BAD_REQUEST,
    message: ['email must be an email', 'password must be at least 8 characters'],
    error: 'Bad Request',
    timestamp: new Date().toISOString(),
    path: '/auth/register',
  },
  unauthorized: {
    statusCode: HttpStatus.UNAUTHORIZED,
    message: 'Invalid email or password',
    error: 'Unauthorized',
    timestamp: new Date().toISOString(),
  },
  conflict: {
    statusCode: HttpStatus.CONFLICT,
    message: 'User with this email already exists',
    error: 'Conflict',
    timestamp: new Date().toISOString(),
  },
  tooManyRequests: (action: string) => ({
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
    message: 'Too Many Requests',
    error: `Too many ${action} attempts. Please try again after 1 minute.`,
    timestamp: new Date().toISOString(),
    retryAfter: 60,
  }),
};

// ✅ أمثلة الـ Body
export const authBodyExamples = {
  register: {
    'Valid Registration': {
      summary: 'Valid user registration',
      value: {
        email: 'user@example.com',
        password: 'SecurePass123',
        firstName: 'Ahmed',
        lastName: 'Mohamed',
      },
    },
    'Invalid - Weak Password': {
      summary: 'Weak password',
      value: {
        email: 'test@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User',
      },
    },
  },
  login: {
    'Valid Credentials': {
      summary: 'Valid email and password',
      value: {
        email: 'user@example.com',
        password: 'SecurePass123',
      },
    },
    'Invalid Credentials': {
      summary: 'Invalid email or password',
      value: {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      },
    },
  },
};
