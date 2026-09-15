import { Injectable } from '@nestjs/common';
import {
  MaintenanceCardStatus,
  MaintenanceWorkEventType,
  MaintenanceWorkStatus,
  Prisma,
} from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { hasPrismaErrorCode } from 'src/common/utils/prisma-error.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequiredWorkInputDto, UpdateRequiredWorkDto } from './dto/maintenance-card.dto';
import { toWorkStateResponse, WorkStateResponse } from './maintenance-card-work.mapper';
import {
  resolveReopenTo,
  resolveWorkTransition,
  WorkStateAction,
  WorkTransitionResult,
} from './maintenance-work-transition';

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

const workActorSelect = {
  select: { id: true, firstName: true, lastName: true },
} as const;

type TransitionOptions = {
  reason?: string;
  targetStatus?: MaintenanceWorkStatus;
};

@Injectable()
export class MaintenanceCardWorkService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequiredWork(cardId: number, dto: RequiredWorkInputDto, userId: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockOpenCard(tx, cardId);
        const work = await tx.maintenanceCardRequiredWork.create({
          data: buildWorkRow(cardId, dto),
        });
        await this.recordEvent(tx, {
          maintenanceCardId: cardId,
          requiredWorkId: work.id,
          eventType: MaintenanceWorkEventType.CREATED,
          fromStatus: null,
          toStatus: MaintenanceWorkStatus.PENDING,
          workDescriptionSnapshot: work.description,
          changedByUserId: userId,
        });
        return work;
      });
    } catch (error) {
      if (hasPrismaErrorCode(error, 'P2002')) {
        throw new AppException(409, 'maintenanceCards.errors.duplicate_work_order');
      }
      throw error;
    }
  }

  /**
   * Updates work data while strictly separating it from status changes.
   * The deprecated `status` field (kept for frontend compatibility) is routed
   * through the same transition engine, so every rule and event still applies.
   */
  async updateRequiredWork(
    cardId: number,
    workId: number,
    dto: UpdateRequiredWorkDto,
    userId: number,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockOpenCard(tx, cardId);
        const existing = await tx.maintenanceCardRequiredWork.findFirst({
          where: { id: workId, maintenanceCardId: cardId },
          select: { id: true, description: true, status: true },
        });
        if (!existing) throw new AppException(404, 'maintenanceCards.errors.work_not_found');

        const dataUpdate = this.buildDataUpdate(dto);
        const hasDataUpdate = Object.keys(dataUpdate).length > 0;

        if (hasDataUpdate) {
          await tx.maintenanceCardRequiredWork.update({
            where: { id: workId },
            data: dataUpdate,
          });
          await this.recordEvent(tx, {
            maintenanceCardId: cardId,
            requiredWorkId: workId,
            eventType: MaintenanceWorkEventType.UPDATED,
            fromStatus: existing.status,
            toStatus: existing.status,
            workDescriptionSnapshot: dataUpdate.description ?? existing.description,
            changedByUserId: userId,
          });
        }

        if (dto.status === undefined) {
          return this.readWorkState(tx, workId);
        }

        const transition = this.resolveDeprecatedTransition(existing.status, dto.status);
        if (!transition) {
          throw new AppException(409, 'maintenanceCards.errors.work_transition_not_allowed');
        }
        return this.applyTransition(tx, cardId, workId, transition.action, userId, {
          reason: transition.reason,
          targetStatus: transition.targetStatus,
        });
      });
    } catch (error) {
      if (hasPrismaErrorCode(error, 'P2002')) {
        throw new AppException(409, 'maintenanceCards.errors.duplicate_work_order');
      }
      throw error;
    }
  }

  startWork(cardId: number, workId: number, userId: number) {
    return this.transition(cardId, workId, 'start', userId);
  }

  completeWork(cardId: number, workId: number, userId: number) {
    return this.transition(cardId, workId, 'complete', userId);
  }

  cancelWork(cardId: number, workId: number, reason: string, userId: number) {
    return this.transition(cardId, workId, 'cancel', userId, { reason });
  }

  reopenWork(
    cardId: number,
    workId: number,
    reason: string,
    userId: number,
    targetStatus?: MaintenanceWorkStatus,
  ) {
    return this.transition(cardId, workId, 'reopen', userId, { reason, targetStatus });
  }

  /**
   * Only a work that is still PENDING and has never been started may be
   * removed. Any started/completed/cancelled work is immutable history and
   * must be cancelled or reopened instead. A REMOVED event keeps the record
   * visible in the timeline.
   */
  deleteRequiredWork(cardId: number, workId: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockOpenCard(tx, cardId);
      const work = await tx.maintenanceCardRequiredWork.findFirst({
        where: { id: workId, maintenanceCardId: cardId },
        select: { id: true, description: true, status: true, startedAt: true },
      });
      if (!work) throw new AppException(404, 'maintenanceCards.errors.work_not_found');
      if (work.status !== MaintenanceWorkStatus.PENDING || work.startedAt !== null) {
        throw new AppException(409, 'maintenanceCards.errors.work_not_removable');
      }
      await tx.maintenanceCardRequiredWork.delete({ where: { id: workId } });
      await this.recordEvent(tx, {
        maintenanceCardId: cardId,
        requiredWorkId: workId,
        eventType: MaintenanceWorkEventType.REMOVED,
        fromStatus: MaintenanceWorkStatus.PENDING,
        toStatus: null,
        workDescriptionSnapshot: work.description,
        changedByUserId: userId,
      });
      return { id: workId };
    });
  }

  async transition(
    cardId: number,
    workId: number,
    action: WorkStateAction,
    userId: number,
    options: TransitionOptions = {},
  ): Promise<WorkStateResponse> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockOpenCard(tx, cardId);
      return this.applyTransition(tx, cardId, workId, action, userId, options);
    });
  }

  private async applyTransition(
    tx: Prisma.TransactionClient,
    cardId: number,
    workId: number,
    action: WorkStateAction,
    userId: number,
    options: TransitionOptions,
  ): Promise<WorkStateResponse> {
    const work = await tx.maintenanceCardRequiredWork.findFirst({
      where: { id: workId, maintenanceCardId: cardId },
      select: { id: true, status: true, description: true },
    });
    if (!work) throw new AppException(404, 'maintenanceCards.errors.work_not_found');

    if (action === 'cancel' && !this.hasReason(options.reason)) {
      throw new AppException(400, 'maintenanceCards.errors.work_cancel_reason_required');
    }
    if (action === 'reopen' && !this.hasReason(options.reason)) {
      throw new AppException(400, 'maintenanceCards.errors.work_reopen_reason_required');
    }

    const transition =
      action === 'reopen'
        ? resolveReopenTo(work.status, options.targetStatus ?? MaintenanceWorkStatus.PENDING)
        : resolveWorkTransition(work.status, action);
    if (!transition) {
      throw new AppException(409, 'maintenanceCards.errors.work_transition_not_allowed');
    }

    if (!transition.changed) {
      return this.readWorkState(tx, workId);
    }

    const changed = await tx.maintenanceCardRequiredWork.updateMany({
      where: { id: workId, maintenanceCardId: cardId, status: transition.from },
      data: this.buildTransitionData(transition, action, userId, options.reason),
    });
    if (changed.count !== 1) {
      throw new AppException(409, 'maintenanceCards.errors.work_transition_conflict');
    }

    await this.recordEvent(tx, {
      maintenanceCardId: cardId,
      requiredWorkId: workId,
      eventType: this.eventTypeFor(action),
      fromStatus: transition.from,
      toStatus: transition.to,
      workDescriptionSnapshot: work.description,
      reason: options.reason,
      changedByUserId: userId,
    });

    return this.readWorkState(tx, workId);
  }

  private buildTransitionData(
    transition: WorkTransitionResult,
    action: WorkStateAction,
    userId: number,
    reason?: string,
  ): Prisma.MaintenanceCardRequiredWorkUncheckedUpdateManyInput {
    const now = new Date();
    switch (action) {
      case 'start':
        return { status: transition.to, startedAt: now, startedByUserId: userId };
      case 'complete':
        return { status: transition.to, completedAt: now, completedByUserId: userId };
      case 'cancel':
        return {
          status: transition.to,
          cancelledAt: now,
          cancelledByUserId: userId,
          cancellationReason: reason,
        };
      case 'reopen':
        return {
          status: transition.to,
          completedAt: null,
          completedByUserId: null,
          startedAt: transition.to === MaintenanceWorkStatus.IN_PROGRESS ? now : null,
          startedByUserId: transition.to === MaintenanceWorkStatus.IN_PROGRESS ? userId : null,
          cancelledAt: null,
          cancelledByUserId: null,
          cancellationReason: null,
        };
    }
  }

  /**
   * Maps a deprecated `status` PATCH to the equivalent lifecycle action so the
   * same rules and events apply. Reopen transitions report no reason (none is
   * accepted on the deprecated field), so the shared engine rejects them with
   * the usual "reason required" error unless the caller also passed reason
   * through no other supported field (it cannot) — forcing frontend adoption
   * of the dedicated endpoints.
   */
  private resolveDeprecatedTransition(
    current: MaintenanceWorkStatus,
    desired: MaintenanceWorkStatus,
  ): { action: WorkStateAction; targetStatus?: MaintenanceWorkStatus; reason?: string } | null {
    if (desired === current) return null;
    if (
      current === MaintenanceWorkStatus.PENDING &&
      desired === MaintenanceWorkStatus.IN_PROGRESS
    ) {
      return { action: 'start' };
    }
    if (
      (current === MaintenanceWorkStatus.PENDING ||
        current === MaintenanceWorkStatus.IN_PROGRESS) &&
      desired === MaintenanceWorkStatus.COMPLETED
    ) {
      return { action: 'complete' };
    }
    if (
      (current === MaintenanceWorkStatus.PENDING ||
        current === MaintenanceWorkStatus.IN_PROGRESS) &&
      desired === MaintenanceWorkStatus.CANCELLED
    ) {
      return { action: 'cancel' };
    }
    if (
      (current === MaintenanceWorkStatus.COMPLETED ||
        current === MaintenanceWorkStatus.CANCELLED) &&
      (desired === MaintenanceWorkStatus.PENDING || desired === MaintenanceWorkStatus.IN_PROGRESS)
    ) {
      return { action: 'reopen', targetStatus: desired };
    }
    return null;
  }

  private async readWorkState(
    tx: Prisma.TransactionClient,
    workId: number,
  ): Promise<WorkStateResponse> {
    const work = await tx.maintenanceCardRequiredWork.findUniqueOrThrow({
      where: { id: workId },
      include: {
        startedBy: workActorSelect,
        completedBy: workActorSelect,
        cancelledBy: workActorSelect,
      },
    });
    return toWorkStateResponse(work);
  }

  private async recordEvent(
    tx: Prisma.TransactionClient,
    data: {
      maintenanceCardId: number;
      requiredWorkId: number | null;
      eventType: MaintenanceWorkEventType;
      fromStatus: MaintenanceWorkStatus | null;
      toStatus: MaintenanceWorkStatus | null;
      workDescriptionSnapshot: string;
      reason?: string;
      changedByUserId: number;
    },
  ): Promise<void> {
    await tx.maintenanceWorkEvent.create({
      data: {
        maintenanceCardId: data.maintenanceCardId,
        requiredWorkId: data.requiredWorkId,
        eventType: data.eventType,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        workDescriptionSnapshot: data.workDescriptionSnapshot,
        reason: data.reason,
        changedByUserId: data.changedByUserId,
      },
    });
  }

  private buildDataUpdate(dto: UpdateRequiredWorkDto): {
    description?: string;
    displayOrder?: number;
    isRequired?: boolean;
    estimatedCost?: Prisma.Decimal | null;
  } {
    return {
      ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
      ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
      ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
      ...(dto.estimatedCost !== undefined
        ? {
            estimatedCost:
              dto.estimatedCost === null ? null : new Prisma.Decimal(dto.estimatedCost),
          }
        : {}),
    };
  }

  private eventTypeFor(action: WorkStateAction): MaintenanceWorkEventType {
    switch (action) {
      case 'start':
        return MaintenanceWorkEventType.STARTED;
      case 'complete':
        return MaintenanceWorkEventType.COMPLETED;
      case 'cancel':
        return MaintenanceWorkEventType.CANCELLED;
      case 'reopen':
        return MaintenanceWorkEventType.REOPENED;
    }
  }

  private hasReason(reason?: string): boolean {
    return Boolean(reason && reason.trim().length > 0);
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
