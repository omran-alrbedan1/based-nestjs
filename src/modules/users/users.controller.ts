import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Role } from 'generated/prisma/client';
import { ResponseMessage } from 'src/common/interceptors/transform.interceptor';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user-dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
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
  async getProfile(@GetUser('id') userId: number): Promise<UserResponseDto> {
    return await this.usersService.findOne(userId);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('users.responses.list_retrieved')
  async findAll(@Query() listQueryDto: UserListQueryDto): Promise<PaginatedUsersResponseDto> {
    return await this.usersService.findAll(listQueryDto);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('users.responses.employee_created')
  async createEmployee(@Body() dto: CreateEmployeeDto): Promise<UserResponseDto> {
    return await this.usersService.createEmployee(dto);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('users.responses.user_retrieved')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return await this.usersService.findOne(id);
  }

  @Patch('me')
  @ResponseMessage('users.responses.user_updated')
  async updateProfile(
    @GetUser('id') userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return await this.usersService.update(userId, updateUserDto);
  }

  @Patch('me/password')
  @ResponseMessage('users.responses.password_updated')
  async updatePassword(
    @GetUser('id') userId: number,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    return await this.usersService.updatePassword(userId, updatePasswordDto);
  }

  @Delete('me')
  @ResponseMessage('users.responses.account_deleted')
  async deleteAccount(@GetUser('id') userId: number): Promise<null> {
    return await this.usersService.deleteAccount(userId);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('users.responses.user_updated')
  async updateManagedUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return await this.usersService.updateManagedUser(id, dto);
  }

  @Patch(':id/activate')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('users.responses.user_activated')
  async activate(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return await this.usersService.activate(id);
  }

  @Patch(':id/deactivate')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('users.responses.user_deactivated')
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') actorId: number,
  ): Promise<UserResponseDto> {
    return await this.usersService.deactivate(id, actorId);
  }
}
