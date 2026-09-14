import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MaintenanceCardOptionsController } from './maintenance-card-options.controller';
import { MaintenanceCardOptionsRepository } from './maintenance-card-options.repository';
import { MaintenanceCardOptionsService } from './maintenance-card-options.service';

@Module({
  imports: [PrismaModule],
  controllers: [MaintenanceCardOptionsController],
  providers: [MaintenanceCardOptionsService, MaintenanceCardOptionsRepository],
})
export class MaintenanceCardOptionsModule {}
