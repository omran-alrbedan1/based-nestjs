import { Injectable } from '@nestjs/common';
import { MaintenanceCardStatus, MaintenanceWorkStatus, Role } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { localizeEmbeddedOptions } from './maintenance-card.mapper';
import { maintenanceCardDetailInclude } from './maintenance-card.selects';

@Injectable()
export class MaintenanceCardLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  close(id: number, userId: number) {
    return this.changeStatus(id, MaintenanceCardStatus.OPEN, MaintenanceCardStatus.CLOSED, userId);
  }

  reopen(id: number, userId: number, role: Role) {
    if (role !== Role.SUPER_ADMIN) {
      throw new AppException(403, 'maintenanceCards.errors.reopen_forbidden');
    }
    return this.changeStatus(id, MaintenanceCardStatus.CLOSED, MaintenanceCardStatus.OPEN, userId);
  }

  private async changeStatus(
    id: number,
    fromStatus: MaintenanceCardStatus,
    toStatus: MaintenanceCardStatus,
    userId: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "maintenance_cards" WHERE "id" = ${id} FOR UPDATE
      `;
      const exists = await tx.maintenanceCard.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!exists) throw new AppException(404, 'maintenanceCards.errors.not_found');
      if (exists.status !== fromStatus) {
        throw new AppException(
          409,
          toStatus === MaintenanceCardStatus.CLOSED
            ? 'maintenanceCards.errors.invalid_close'
            : 'maintenanceCards.errors.invalid_reopen',
        );
      }
      if (toStatus === MaintenanceCardStatus.CLOSED) {
        const incompleteRequiredWorks = await tx.maintenanceCardRequiredWork.count({
          where: {
            maintenanceCardId: id,
            isRequired: true,
            status: { notIn: [MaintenanceWorkStatus.COMPLETED, MaintenanceWorkStatus.CANCELLED] },
          },
        });
        if (incompleteRequiredWorks > 0) {
          throw new AppException(409, 'maintenanceCards.errors.required_work_incomplete');
        }
      }
      const changedAt = new Date();
      const changed = await tx.maintenanceCard.updateMany({
        where: { id, status: fromStatus },
        data:
          toStatus === MaintenanceCardStatus.CLOSED
            ? { status: toStatus, closedAt: changedAt, closedByUserId: userId }
            : { status: toStatus, closedAt: null, closedByUserId: null },
      });
      if (changed.count !== 1) {
        throw new AppException(
          409,
          toStatus === MaintenanceCardStatus.CLOSED
            ? 'maintenanceCards.errors.invalid_close'
            : 'maintenanceCards.errors.invalid_reopen',
        );
      }
      await tx.maintenanceCardStatusEvent.create({
        data: { maintenanceCardId: id, fromStatus, toStatus, changedByUserId: userId },
      });
      return localizeEmbeddedOptions(
        await tx.maintenanceCard.findUniqueOrThrow({
          where: { id },
          include: maintenanceCardDetailInclude,
        }),
      );
    });
  }
}
