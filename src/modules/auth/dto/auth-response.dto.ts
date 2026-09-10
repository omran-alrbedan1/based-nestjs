import { Role } from '../../../../generated/prisma/client';

export class AuthUserDto {
  id!: string;

  email!: string;

  firstName!: string | null;

  lastName!: string | null;

  role!: Role;

  createdAt!: Date;

  updatedAt!: Date;
}

export class AuthResponseDto {
  accessToken!: string;

  refreshToken!: string;

  user!: AuthUserDto;
}
