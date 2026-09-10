import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MaintenanceCardOptionsController } from './maintenance-card-options.controller';
import { MaintenanceCardOptionsService } from './maintenance-card-options.service';

@Module({
  imports: [PrismaModule],
  controllers: [MaintenanceCardOptionsController],
  providers: [MaintenanceCardOptionsService],
})
export class MaintenanceCardOptionsModule {}
