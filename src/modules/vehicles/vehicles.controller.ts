import {
  Body,
  Controller,
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
import { MaintenanceHistoryQueryDto } from 'src/common/dto/maintenance-history-query.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { ResponseMessage } from 'src/common/interceptors/transform.interceptor';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleListQueryDto } from './dto/vehicle-list-query.dto';
import { VehiclesService } from './vehicles.service';
import { VehicleOwnershipService } from './vehicle-ownership.service';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller({ path: 'vehicles', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly vehicleOwnershipService: VehicleOwnershipService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a vehicle with its initial ownership' })
  @ApiCreatedResponse({ description: 'Vehicle and ownership created.' })
  @ResponseMessage('vehicles.responses.created')
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and search vehicles' })
  @ApiOkResponse({ description: 'Paginated vehicles with current owners.' })
  @ResponseMessage('vehicles.responses.list_retrieved')
  findAll(@Query() query: VehicleListQueryDto) {
    return this.vehiclesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle details and current owner' })
  @ResponseMessage('vehicles.responses.retrieved')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findOne(id);
  }

  @Get(':id/maintenance-history')
  @ApiOperation({ summary: 'Get vehicle maintenance history across ownership changes' })
  @ApiOkResponse({ description: 'Vehicle, current owner, and paginated historical visits.' })
  @ResponseMessage('vehicles.responses.maintenance_history_retrieved')
  maintenanceHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MaintenanceHistoryQueryDto,
  ) {
    return this.vehiclesService.maintenanceHistory(id, query);
  }

  @Patch(':id')
  @ResponseMessage('vehicles.responses.updated')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @ResponseMessage('vehicles.responses.deactivated')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.deactivate(id);
  }

  @Patch(':id/activate')
  @ResponseMessage('vehicles.responses.activated')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.activate(id);
  }

  @Get(':id/ownership')
  @ApiOperation({ summary: 'Get current owner and immutable ownership history' })
  @ResponseMessage('ownership.responses.retrieved')
  getOwnership(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleOwnershipService.getOwnership(id);
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({ summary: 'Transfer an active vehicle to an active customer' })
  @ResponseMessage('ownership.responses.transferred')
  transfer(@Param('id', ParseIntPipe) id: number, @Body() dto: TransferOwnershipDto) {
    return this.vehicleOwnershipService.transferOwnership(id, dto);
  }
}
