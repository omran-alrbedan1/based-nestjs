import { Injectable } from '@nestjs/common';
import { Role } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateUserDto } from './dto/update-user-dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import * as bcrypt from 'bcrypt';
import { AppException } from 'src/common/exceptions/app.exception';
import { createPaginatedResponse, normalizeListQuery } from 'src/common/utils/pagination.util';
import { buildUserWhereInput } from './users.query-builder';

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 12;

  constructor(private prisma: PrismaService) {}

  private readonly userSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    role: true,
    isActive: true,
    password: false,
    createdAt: true,
    updatedAt: true,
  } as const;

  async findOne(userId: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelect,
    });

    if (!user) {
      throw new AppException(404, 'users.errors.not_found');
    }

    return user;
  }

  async findAll(listQueryDto: UserListQueryDto): Promise<PaginatedUsersResponseDto> {
    const { page, limit, skip, search } = normalizeListQuery(listQueryDto);
    const where = buildUserWhereInput({
      search,
      isActive: listQueryDto.isActive,
      role: listQueryDto.role,
    });

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: this.userSelect,
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return createPaginatedResponse(items, page, limit, total);
  }

  async createEmployee(dto: CreateEmployeeDto): Promise<UserResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new AppException(409, 'users.errors.email_taken');
    }

    const password = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    return this.prisma.user.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        password,
        role: Role.ADMIN,
        isActive: true,
      },
      select: this.userSelect,
    });
  }

  async updateManagedUser(userId: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new AppException(404, 'users.errors.not_found');
    }

    const email = dto.email?.trim().toLowerCase();

    if (email && email !== user.email) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (emailTaken) {
        throw new AppException(409, 'users.errors.email_taken');
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName?.trim() ?? null } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName?.trim() ?? null } : {}),
        ...(email ? { email } : {}),
      },
      select: this.userSelect,
    });
  }

  async activate(userId: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new AppException(404, 'users.errors.not_found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: this.userSelect,
    });
  }

  async deactivate(userId: number, actorId: number): Promise<UserResponseDto> {
    if (userId === actorId) {
      throw new AppException(400, 'users.errors.cannot_deactivate_self');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new AppException(404, 'users.errors.not_found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, refreshToken: null },
      select: this.userSelect,
    });
  }

  async update(userId: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    if (!user) {
      throw new AppException(404, 'users.errors.not_found');
    }
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (emailTaken) {
        throw new AppException(409, 'users.errors.email_taken');
      }
    }

    return await this.prisma.user.update({
      where: { id: userId },
      data: updateUserDto,
      select: this.userSelect,
    });
  }

  async updatePassword(
    userId: number,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = updatePasswordDto;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new AppException(404, 'users.errors.not_found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      throw new AppException(401, 'auth.errors.current_password_incorrect');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      throw new AppException(409, 'users.errors.same_password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        refreshToken: null,
      },
    });

    return { message: 'password changed successfully' };
  }

  async deleteAccount(userId: number): Promise<null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new AppException(404, 'users.errors.not_found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        refreshToken: null,
      },
    });

    return null;
  }
}
