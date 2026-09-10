import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LocalFileStorageModule } from 'src/storage/local-file-storage.module';
import { MaintenanceCardValidator } from './maintenance-card.validator';
import { MaintenanceCardMediaController } from './maintenance-card-media.controller';
import { MaintenanceCardMediaService } from './maintenance-card-media.service';
import { MaintenanceCardsController } from './maintenance-cards.controller';
import { MaintenanceCardsService } from './maintenance-cards.service';

@Module({
  imports: [PrismaModule, LocalFileStorageModule],
  controllers: [MaintenanceCardsController, MaintenanceCardMediaController],
  providers: [MaintenanceCardsService, MaintenanceCardValidator, MaintenanceCardMediaService],
})
export class MaintenanceCardsModule {}
