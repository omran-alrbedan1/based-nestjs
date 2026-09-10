import { HttpStatus } from '@nestjs/common';

// ✅ Success Examples
export const userSuccessExamples = {
  profile: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    firstName: 'Ahmed',
    lastName: 'Mohamed',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  allUsers: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      firstName: 'Ahmed',
      lastName: 'Mohamed',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '223e4567-e89b-12d3-a456-426614174001',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
};

// ✅ Error Examples
export const userErrorExamples = {
  badRequest: {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Invalid user ID format',
    error: 'Bad Request',
    timestamp: new Date().toISOString(),
    path: '/users/invalid-id',
  },
  unauthorized: {
    statusCode: HttpStatus.UNAUTHORIZED,
    message: 'Unauthorized',
    error: 'Unauthorized',
    timestamp: new Date().toISOString(),
  },
  forbidden: {
    statusCode: HttpStatus.FORBIDDEN,
    message: 'Forbidden resource',
    error: 'Forbidden',
    timestamp: new Date().toISOString(),
  },
  notFound: {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'User with ID 123e4567-e89b-12d3-a456-426614174000 not found',
    error: 'Not Found',
    timestamp: new Date().toISOString(),
    path: '/users/123e4567-e89b-12d3-a456-426614174000',
  },
  invalidPassword: {
    statusCode: HttpStatus.UNAUTHORIZED,
    message: 'Current password is incorrect',
    error: 'Unauthorized',
    timestamp: new Date().toISOString(),
    path: '/users/me/password',
  },
  deleteFailed: {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'user not found',
    error: 'Not Found',
    timestamp: new Date().toISOString(),
    path: '/users/me',
  },
};

export const userBodyExamples = {
  updateUser: {
    'Valid Update': {
      summary: 'Update user profile',
      value: {
        firstName: 'UpdatedName',
        lastName: 'UpdatedLastName',
      },
    },
  },
  updatePassword: {
    'Valid Password Update': {
      summary: 'Update current user password',
      value: {
        currentPassword: 'OldPassword@123',
        newPassword: 'NewPassword@123',
      },
    },
    'Invalid - Weak Password': {
      summary: 'New password does not meet validation rules',
      value: {
        currentPassword: 'OldPassword@123',
        newPassword: '123',
      },
    },
  },
};
