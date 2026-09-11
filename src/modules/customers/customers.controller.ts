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
import { CustomerMaintenanceHistoryQueryDto } from 'src/common/dto/maintenance-history-query.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { ResponseMessage } from 'src/utils/transform.interceptor';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerListQueryDto } from './dto/customer-list-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller({ path: 'customers', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer' })
  @ApiCreatedResponse({ description: 'Customer created.' })
  @ResponseMessage('customers.responses.created')
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and search customers' })
  @ApiOkResponse({ description: 'Paginated customers.' })
  @ResponseMessage('customers.responses.list_retrieved')
  findAll(@Query() query: CustomerListQueryDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer details and currently owned vehicles' })
  @ResponseMessage('customers.responses.retrieved')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Get(':id/maintenance-history')
  @ApiOperation({ summary: 'Get paginated maintenance history for a customer' })
  @ApiOkResponse({ description: 'Customer summary and paginated historical visits.' })
  @ResponseMessage('customers.responses.maintenance_history_retrieved')
  maintenanceHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: CustomerMaintenanceHistoryQueryDto,
  ) {
    return this.customersService.maintenanceHistory(id, query);
  }

  @Patch(':id')
  @ResponseMessage('customers.responses.updated')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @ResponseMessage('customers.responses.deactivated')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.deactivate(id);
  }

  @Patch(':id/activate')
  @ResponseMessage('customers.responses.activated')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.activate(id);
  }
}
