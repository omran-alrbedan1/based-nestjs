import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from 'generated/prisma/client';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { ResponseMessage } from 'src/utils/transform.interceptor';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  CreateMaintenanceCardOptionDto,
  OptionListQueryDto,
  UpdateMaintenanceCardOptionDto,
} from './dto/maintenance-card-option.dto';
import { MaintenanceCardOptionsService, OptionKind } from './maintenance-card-options.service';

@ApiTags('Maintenance Card Options')
@ApiBearerAuth()
@Controller({ path: 'maintenance-card-options', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class MaintenanceCardOptionsController {
  constructor(private readonly service: MaintenanceCardOptionsService) {}

  @Get(':kind')
  @ApiOperation({ summary: 'List configurable maintenance-card options' })
  @ResponseMessage('maintenanceCardOptions.responses.list_retrieved')
  list(@Param('kind') kind: string, @Query() query: OptionListQueryDto) {
    return this.service.list(this.parseKind(kind), query.isActive);
  }

  @Post(':kind')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('maintenanceCardOptions.responses.created')
  create(
    @Param('kind') kind: string,
    @Body() dto: CreateMaintenanceCardOptionDto,
    @GetUser('id') userId: string,
    @GetUser('role') role: string,
  ) {
    return this.service.create(this.parseKind(kind), dto, userId, role);
  }

  @Patch(':kind/:id')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('maintenanceCardOptions.responses.updated')
  update(
    @Param('kind') kind: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceCardOptionDto,
    @GetUser('role') role: string,
  ) {
    return this.service.update(this.parseKind(kind), id, dto, role);
  }

  @Patch(':kind/:id/activate')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('maintenanceCardOptions.responses.activated')
  activate(
    @Param('kind') kind: string,
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('role') role: string,
  ) {
    return this.service.setActive(this.parseKind(kind), id, true, role);
  }

  @Patch(':kind/:id/deactivate')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('maintenanceCardOptions.responses.deactivated')
  deactivate(
    @Param('kind') kind: string,
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('role') role: string,
  ) {
    return this.service.setActive(this.parseKind(kind), id, false, role);
  }

  @Delete(':kind/:id')
  @Roles(Role.SUPER_ADMIN)
  @ResponseMessage('maintenanceCardOptions.responses.deleted')
  delete(
    @Param('kind') kind: string,
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('role') role: string,
  ) {
    return this.service.delete(this.parseKind(kind), id, role);
  }

  private parseKind(value: string): OptionKind {
    const kinds: Record<string, OptionKind> = {
      'visit-reasons': 'visitReason',
      'vehicle-conditions': 'vehicleCondition',
      'vehicle-items': 'vehicleItem',
    };
    const kind = kinds[value];
    if (!kind) throw new AppException(404, 'maintenanceCardOptions.errors.kind_not_found');
    return kind;
  }
}
