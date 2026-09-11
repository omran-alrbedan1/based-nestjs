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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from 'generated/prisma/client';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { ResponseMessage } from 'src/utils/transform.interceptor';
import {
  CreateMaintenanceCardDto,
  RequiredWorkInputDto,
  UpdateMaintenanceCardDto,
  UpdateRequiredWorkDto,
} from './dto/maintenance-card.dto';
import { MaintenanceCardListQueryDto } from './dto/maintenance-card-list-query.dto';
import { MaintenanceCardsService } from './maintenance-cards.service';

@ApiTags('Maintenance Cards')
@ApiBearerAuth()
@Controller({ path: 'maintenance-cards', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class MaintenanceCardsController {
  constructor(private readonly service: MaintenanceCardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an open maintenance card and initial status event' })
  @ApiCreatedResponse({ description: 'Maintenance card created.' })
  @ResponseMessage('maintenanceCards.responses.created')
  create(@Body() dto: CreateMaintenanceCardDto, @GetUser('id') userId: number) {
    return this.service.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter maintenance cards' })
  @ApiOkResponse({ description: 'Paginated maintenance-card dashboard data.' })
  @ResponseMessage('maintenanceCards.responses.list_retrieved')
  findAll(@Query() query: MaintenanceCardListQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('maintenanceCards.responses.retrieved')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('maintenanceCards.responses.updated')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaintenanceCardDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/required-works')
  @ApiOperation({ summary: 'Add a work item to an open maintenance card' })
  @ResponseMessage('maintenanceCards.responses.work_created')
  createRequiredWork(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequiredWorkInputDto,
  ) {
    return this.service.createRequiredWork(id, dto);
  }

  @Patch(':id/required-works/:workId')
  @ApiOperation({ summary: 'Update a work item on an open maintenance card' })
  @ResponseMessage('maintenanceCards.responses.work_updated')
  updateRequiredWork(
    @Param('id', ParseIntPipe) id: number,
    @Param('workId', ParseIntPipe) workId: number,
    @Body() dto: UpdateRequiredWorkDto,
  ) {
    return this.service.updateRequiredWork(id, workId, dto);
  }

  @Delete(':id/required-works/:workId')
  @ApiOperation({ summary: 'Delete a work item from an open maintenance card' })
  @ResponseMessage('maintenanceCards.responses.work_deleted')
  deleteRequiredWork(
    @Param('id', ParseIntPipe) id: number,
    @Param('workId', ParseIntPipe) workId: number,
  ) {
    return this.service.deleteRequiredWork(id, workId);
  }

  @Post(':id/close')
  @ResponseMessage('maintenanceCards.responses.closed')
  close(@Param('id', ParseIntPipe) id: number, @GetUser('id') userId: number) {
    return this.service.close(id, userId);
  }

  @Post(':id/reopen')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('maintenanceCards.responses.reopened')
  reopen(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: string,
  ) {
    return this.service.reopen(id, userId, role);
  }
}
