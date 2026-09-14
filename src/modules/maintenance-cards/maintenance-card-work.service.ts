import { Injectable } from '@nestjs/common';
import { MaintenanceCardStatus, MaintenanceWorkStatus, Prisma } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { hasPrismaErrorCode } from 'src/common/utils/prisma-error.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequiredWorkInputDto, UpdateRequiredWorkDto } from './dto/maintenance-card.dto';

export function buildWorkRow(cardId: number, work: RequiredWorkInputDto) {
  return {
    maintenanceCardId: cardId,
    description: work.description.trim(),
    displayOrder: work.displayOrder,
    isRequired: work.isRequired ?? true,
    estimatedCost:
      work.estimatedCost == null ? work.estimatedCost : new Prisma.Decimal(work.estimatedCost),
  };
}

@Injectable()
export class MaintenanceCardWorkService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequiredWork(id: number, dto: RequiredWorkInputDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockOpenCard(tx, id);
        return tx.maintenanceCardRequiredWork.create({
          data: buildWorkRow(id, dto),
        });
      });
    } catch (error) {
      if (hasPrismaErrorCode(error, 'P2002')) {
        throw new AppException(409, 'maintenanceCards.errors.duplicate_work_order');
      }
      throw error;
    }
  }

  async updateRequiredWork(id: number, workId: number, dto: UpdateRequiredWorkDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockOpenCard(tx, id);
        const work = await tx.maintenanceCardRequiredWork.findFirst({
          where: { id: workId, maintenanceCardId: id },
          select: { id: true },
        });
        if (!work) throw new AppException(404, 'maintenanceCards.errors.work_not_found');
        const status = dto.status;
        return tx.maintenanceCardRequiredWork.update({
          where: { id: workId },
          data: {
            ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
            ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
            ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
            ...(dto.estimatedCost !== undefined
              ? {
                  estimatedCost:
                    dto.estimatedCost === null ? null : new Prisma.Decimal(dto.estimatedCost),
                }
              : {}),
            ...(status !== undefined
              ? {
                  status,
                  completedAt: status === MaintenanceWorkStatus.COMPLETED ? new Date() : null,
                }
              : {}),
          },
        });
      });
    } catch (error) {
      if (hasPrismaErrorCode(error, 'P2002')) {
        throw new AppException(409, 'maintenanceCards.errors.duplicate_work_order');
      }
      throw error;
    }
  }

  deleteRequiredWork(id: number, workId: number) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockOpenCard(tx, id);
      const deleted = await tx.maintenanceCardRequiredWork.deleteMany({
        where: { id: workId, maintenanceCardId: id },
      });
      if (deleted.count !== 1) {
        throw new AppException(404, 'maintenanceCards.errors.work_not_found');
      }
      return { id: workId };
    });
  }

  private async lockOpenCard(tx: Prisma.TransactionClient, id: number): Promise<void> {
    await tx.$queryRaw`
      SELECT "id" FROM "maintenance_cards" WHERE "id" = ${id} FOR UPDATE
    `;
    const card = await tx.maintenanceCard.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!card) throw new AppException(404, 'maintenanceCards.errors.not_found');
    if (card.status === MaintenanceCardStatus.CLOSED) {
      throw new AppException(409, 'maintenanceCards.errors.closed_read_only');
    }
  }
}
