import { Role } from 'generated/prisma/client';

export class UserResponseDto {
  id!: number;

  email!: string;

  firstName!: string | null;

  lastName!: string | null;

  role!: Role;

  isActive!: boolean;

  createdAt!: Date;

  updatedAt!: Date;
}
