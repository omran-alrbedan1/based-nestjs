import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { UpdateUserDto } from './dto/update-user-dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import * as bcrypt from 'bcrypt';
import { AppException } from 'src/common/exceptions/app.exception';
import { BaseListQueryDto } from 'src/common/dto/base-list-query.dto';
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

  async findOne(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelect,
    });

    if (!user) {
      throw new AppException(404, 'users.errors.not_found');
    }

    return user;
  }

  async findAll(listQueryDto: BaseListQueryDto): Promise<PaginatedUsersResponseDto> {
    const { page, limit, skip, search } = normalizeListQuery(listQueryDto);
    const where = buildUserWhereInput(search);

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

  async update(userId: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
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
    userId: string,
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

  async deleteAccount(userId: string): Promise<null> {
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
