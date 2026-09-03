import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { BaseListQueryDto } from 'src/common/dto/base-list-query.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Role } from 'generated/prisma';
import { ResponseMessage } from 'src/utils/transform.interceptor';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user-dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@Controller({
  path: 'users',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ResponseMessage('users.responses.profile_retrieved')
  async getProfile(@GetUser('id') userId: string): Promise<UserResponseDto> {
    return await this.usersService.findOne(userId);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ResponseMessage('users.responses.list_retrieved')
  async findAll(
    @Query() listQueryDto: BaseListQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    return await this.usersService.findAll(listQueryDto);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ResponseMessage('users.responses.user_retrieved')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return await this.usersService.findOne(id);
  }

  @Patch('me')
  @ResponseMessage('users.responses.user_updated')
  async updateProfile(
    @GetUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return await this.usersService.update(userId, updateUserDto);
  }

  @Patch('me/password')
  @ResponseMessage('users.responses.password_updated')
  async updatePassword(
    @GetUser('id') userId: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    return await this.usersService.updatePassword(userId, updatePasswordDto);
  }

  @Delete('me')
  @ResponseMessage('users.responses.account_deleted')
  async deleteAccount(@GetUser('id') userId: string): Promise<null> {
    return await this.usersService.deleteAccount(userId);
  }
}
