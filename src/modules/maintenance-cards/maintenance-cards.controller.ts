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
import { ResponseMessage } from 'src/common/interceptors/transform.interceptor';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import {
  CreateMaintenanceCardDto,
  RequiredWorkInputDto,
  UpdateMaintenanceCardDto,
  UpdateRequiredWorkDto,
} from './dto/maintenance-card.dto';
import { ReopenWorkDto, WorkActionReasonDto } from './dto/maintenance-card-work-action.dto';
import { MaintenanceCardListQueryDto } from './dto/maintenance-card-list-query.dto';
import { MaintenanceCardActivityService } from './maintenance-card-activity.service';
import { MaintenanceCardsService } from './maintenance-cards.service';
import { MaintenanceCardWorkService } from './maintenance-card-work.service';
import { MaintenanceCardLifecycleService } from './maintenance-card-lifecycle.service';

@ApiTags('Maintenance Cards')
@ApiBearerAuth()
@Controller({ path: 'maintenance-cards', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class MaintenanceCardsController {
  constructor(
    private readonly service: MaintenanceCardsService,
    private readonly workService: MaintenanceCardWorkService,
    private readonly lifecycleService: MaintenanceCardLifecycleService,
    private readonly activityService: MaintenanceCardActivityService,
  ) {}

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

  @Get(':id/activity')
  @ApiOperation({ summary: 'Unified card + work activity timeline' })
  @ApiOkResponse({ description: 'Paginated activity timeline.' })
  @ResponseMessage('maintenanceCards.responses.activity_retrieved')
  activity(@Param('id', ParseIntPipe) id: number, @Query() query: PaginationQueryDto) {
    return this.activityService.getActivity(id, query);
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
    @GetUser('id') userId: number,
  ) {
    return this.workService.createRequiredWork(id, dto, userId);
  }

  @Patch(':id/required-works/:workId')
  @ApiOperation({ summary: 'Update a work item on an open maintenance card' })
  @ResponseMessage('maintenanceCards.responses.work_updated')
  updateRequiredWork(
    @Param('id', ParseIntPipe) id: number,
    @Param('workId', ParseIntPipe) workId: number,
    @Body() dto: UpdateRequiredWorkDto,
    @GetUser('id') userId: number,
  ) {
    return this.workService.updateRequiredWork(id, workId, dto, userId);
  }

  @Post(':id/required-works/:workId/start')
  @ApiOperation({ summary: 'Start a work item on an open maintenance card' })
  @ResponseMessage('maintenanceCards.responses.work_started')
  startWork(
    @Param('id', ParseIntPipe) id: number,
    @Param('workId', ParseIntPipe) workId: number,
    @GetUser('id') userId: number,
  ) {
    return this.workService.startWork(id, workId, userId);
  }

  @Post(':id/required-works/:workId/complete')
  @ApiOperation({ summary: 'Complete a work item on an open maintenance card' })
  @ResponseMessage('maintenanceCards.responses.work_completed')
  completeWork(
    @Param('id', ParseIntPipe) id: number,
    @Param('workId', ParseIntPipe) workId: number,
    @GetUser('id') userId: number,
  ) {
    return this.workService.completeWork(id, workId, userId);
  }

  @Post(':id/required-works/:workId/cancel')
  @ApiOperation({ summary: 'Cancel a work item with a reason on an open maintenance card' })
  @ResponseMessage('maintenanceCards.responses.work_cancelled')
  cancelWork(
    @Param('id', ParseIntPipe) id: number,
    @Param('workId', ParseIntPipe) workId: number,
    @Body() dto: WorkActionReasonDto,
    @GetUser('id') userId: number,
  ) {
    return this.workService.cancelWork(id, workId, dto.reason, userId);
  }

  @Post(':id/required-works/:workId/reopen')
  @ApiOperation({ summary: 'Reopen a completed or cancelled work item with a reason' })
  @ResponseMessage('maintenanceCards.responses.work_reopened')
  reopenWork(
    @Param('id', ParseIntPipe) id: number,
    @Param('workId', ParseIntPipe) workId: number,
    @Body() dto: ReopenWorkDto,
    @GetUser('id') userId: number,
  ) {
    return this.workService.reopenWork(id, workId, dto.reason, userId, dto.targetStatus);
  }

  @Delete(':id/required-works/:workId')
  @ApiOperation({ summary: 'Remove a not-yet-started work item from an open maintenance card' })
  @ResponseMessage('maintenanceCards.responses.work_deleted')
  deleteRequiredWork(
    @Param('id', ParseIntPipe) id: number,
    @Param('workId', ParseIntPipe) workId: number,
    @GetUser('id') userId: number,
  ) {
    return this.workService.deleteRequiredWork(id, workId, userId);
  }

  @Post(':id/close')
  @ResponseMessage('maintenanceCards.responses.closed')
  close(@Param('id', ParseIntPipe) id: number, @GetUser('id') userId: number) {
    return this.lifecycleService.close(id, userId);
  }

  @Post(':id/reopen')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('maintenanceCards.responses.reopened')
  reopen(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: Role,
  ) {
    return this.lifecycleService.reopen(id, userId, role);
  }
}
