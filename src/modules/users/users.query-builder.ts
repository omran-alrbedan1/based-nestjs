import { Prisma, Role } from 'generated/prisma/client';

export interface UserListFilters {
  search?: string;
  isActive?: boolean;
  role?: Role;
}

export function buildUserWhereInput(filters: UserListFilters = {}): Prisma.UserWhereInput {
  const { search, isActive, role } = filters;

  return {
    ...(isActive !== undefined ? { isActive } : {}),
    ...(role !== undefined ? { role } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}