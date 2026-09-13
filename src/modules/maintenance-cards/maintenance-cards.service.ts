import { Injectable } from '@nestjs/common';
import {
  MaintenanceCardStatus,
  MaintenanceWorkStatus,
  Prisma,
  Role,
} from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { createPaginatedResponse, normalizeListQuery } from 'src/common/utils/pagination.util';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateMaintenanceCardDto,
  RequiredWorkInputDto,
  UpdateMaintenanceCardDto,
  UpdateRequiredWorkDto,
} from './dto/maintenance-card.dto';
import { MaintenanceCardListQueryDto } from './dto/maintenance-card-list-query.dto';
import { maintenanceCardDetailInclude } from './maintenance-card.selects';
import { MaintenanceCardValidator } from './maintenance-card.validator';
import { buildMaintenanceCardWhere } from './maintenance-cards.query-builder';

@Injectable()
export class MaintenanceCardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: MaintenanceCardValidator,
  ) {}

  async create(dto: CreateMaintenanceCardDto, userId: number) {
    await this.validator.validateCreate(dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const cardNumber = await this.nextCardNumber(tx);
        const card = await tx.maintenanceCard.create({
          data: {
            cardNumber,
            customerId: dto.customerId,
            vehicleOwnershipId: dto.vehicleOwnershipId,
            receivedAt: new Date(dto.receivedAt),
            expectedDeliveryAt: dto.expectedDeliveryAt ? new Date(dto.expectedDeliveryAt) : null,
            mileage: dto.mileage,
            fuelLevel: dto.fuelLevel,
            customerComplaint: this.optionalText(dto.customerComplaint),
            inspectionNotes: this.optionalText(dto.inspectionNotes),
            customerApproved: dto.customerApproved,
            customerApprovalName: dto.customerApproved
              ? this.optionalText(dto.customerApprovalName)
              : null,
            customerApprovedAt:
              dto.customerApproved && dto.customerApprovedAt
                ? new Date(dto.customerApprovedAt)
                : null,
            createdByUserId: userId,
          },
          select: { id: true },
        });
        await this.createRelatedRows(tx, card.id, dto, userId);
        const created = await tx.maintenanceCard.findUniqueOrThrow({
          where: { id: card.id },
          include: maintenanceCardDetailInclude,
        });
        return this.localizeEmbeddedOptions(created);
      });
    } catch (error) {
      if (this.isUniqueError(error)) {
        throw new AppException(409, 'maintenanceCards.errors.duplicate_number');
      }
      if (error instanceof AppException) throw error;
      throw new AppException(500, 'database.errors.operation_failed');
    }
  }

  async findAll(query: MaintenanceCardListQueryDto) {
    if (
      query.receivedFrom &&
      query.receivedTo &&
      new Date(query.receivedFrom) > new Date(query.receivedTo)
    ) {
      throw new AppException(400, 'maintenanceCards.errors.invalid_date_range');
    }
    const { page, limit, skip, search } = normalizeListQuery(query);
    const where = buildMaintenanceCardWhere(query, search);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.maintenanceCard.findMany({
        where,
        select: {
          id: true,
          cardNumber: true,
          status: true,
          receivedAt: true,
          expectedDeliveryAt: true,
          mileage: true,
          customer: { select: { id: true, name: true, phone: true, email: true } },
          vehicleOwnership: {
            select: {
              id: true,
              startedAt: true,
              endedAt: true,
              vehicle: {
                select: {
                  id: true,
                  make: true,
                  model: true,
                  plateNumber: true,
                  vin: true,
                  isActive: true,
                },
              },
            },
          },
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.maintenanceCard.count({ where }),
    ]);
    return createPaginatedResponse(items, page, limit, total);
  }

  async findOne(id: number) {
    const card = await this.prisma.maintenanceCard.findUnique({
      where: { id },
      include: maintenanceCardDetailInclude,
    });
    if (!card) throw new AppException(404, 'maintenanceCards.errors.not_found');
    return this.localizeEmbeddedOptions(card);
  }

  async update(id: number, dto: UpdateMaintenanceCardDto) {
    const current = await this.prisma.maintenanceCard.findUnique({
      where: { id },
      select: {
        status: true,
        receivedAt: true,
        customerApproved: true,
        customerApprovalName: true,
        customerApprovedAt: true,
      },
    });
    if (!current) throw new AppException(404, 'maintenanceCards.errors.not_found');
    if (current.status === MaintenanceCardStatus.CLOSED) {
      throw new AppException(409, 'maintenanceCards.errors.closed_read_only');
    }
    await this.validator.validateUpdate(current, dto);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceCard.updateMany({
        where: { id, status: MaintenanceCardStatus.OPEN },
        data: this.buildUpdateData(dto),
      });
      if (updated.count !== 1) {
        throw new AppException(409, 'maintenanceCards.errors.closed_read_only');
      }
      await this.replaceRelatedRows(tx, id, dto);
      const card = await tx.maintenanceCard.findUniqueOrThrow({
        where: { id },
        include: maintenanceCardDetailInclude,
      });
      return this.localizeEmbeddedOptions(card);
    });
  }

  async createRequiredWork(id: number, dto: RequiredWorkInputDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockOpenCard(tx, id);
        return tx.maintenanceCardRequiredWork.create({
          data: this.workData(id, [dto])[0],
        });
      });
    } catch (error) {
      if (this.isUniqueError(error)) {
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
      if (this.isUniqueError(error)) {
        throw new AppException(409, 'maintenanceCards.errors.duplicate_work_order');
      }
      throw error;
    }
  }

  async deleteRequiredWork(id: number, workId: number) {
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

  close(id: number, userId: number) {
    return this.changeStatus(id, MaintenanceCardStatus.OPEN, MaintenanceCardStatus.CLOSED, userId);
  }

  reopen(id: number, userId: number, role: string) {
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
      return tx.maintenanceCard.findUniqueOrThrow({
        where: { id },
        include: maintenanceCardDetailInclude,
      });
    });
  }

  private buildUpdateData(dto: UpdateMaintenanceCardDto) {
    const disapproved = dto.customerApproved === false;
    return {
      ...(dto.expectedDeliveryAt !== undefined
        ? {
            expectedDeliveryAt: dto.expectedDeliveryAt ? new Date(dto.expectedDeliveryAt) : null,
          }
        : {}),
      ...(dto.mileage !== undefined ? { mileage: dto.mileage } : {}),
      ...(dto.fuelLevel !== undefined ? { fuelLevel: dto.fuelLevel } : {}),
      ...(dto.customerComplaint !== undefined
        ? { customerComplaint: this.optionalText(dto.customerComplaint) }
        : {}),
      ...(dto.inspectionNotes !== undefined
        ? { inspectionNotes: this.optionalText(dto.inspectionNotes) }
        : {}),
      ...(dto.customerApproved !== undefined ? { customerApproved: dto.customerApproved } : {}),
      ...(disapproved
        ? {
            customerApprovalName: null,
            customerApprovedAt: null,
          }
        : {
            ...(dto.customerApprovalName !== undefined
              ? { customerApprovalName: this.optionalText(dto.customerApprovalName) }
              : {}),
            ...(dto.customerApprovedAt !== undefined
              ? { customerApprovedAt: new Date(dto.customerApprovedAt) }
              : {}),
          }),
    };
  }

  private async createRelatedRows(
    tx: Prisma.TransactionClient,
    cardId: number,
    dto: CreateMaintenanceCardDto,
    userId: number,
  ): Promise<void> {
    await Promise.all([
      this.createSelections(tx, cardId, dto),
      dto.requiredWorks?.length
        ? tx.maintenanceCardRequiredWork.createMany({
            data: this.workData(cardId, dto.requiredWorks),
          })
        : Promise.resolve(),
      tx.maintenanceCardStatusEvent.create({
        data: {
          maintenanceCardId: cardId,
          fromStatus: null,
          toStatus: MaintenanceCardStatus.OPEN,
          changedByUserId: userId,
        },
      }),
    ]);
  }

  private async replaceRelatedRows(
    tx: Prisma.TransactionClient,
    cardId: number,
    dto: UpdateMaintenanceCardDto,
  ): Promise<void> {
    if (dto.visitReasonIds !== undefined) {
      await tx.maintenanceCardVisitReason.deleteMany({ where: { maintenanceCardId: cardId } });
      if (dto.visitReasonIds.length) {
        await tx.maintenanceCardVisitReason.createMany({
          data: dto.visitReasonIds.map((visitReasonId) => ({
            maintenanceCardId: cardId,
            visitReasonId,
          })),
        });
      }
    }
    if (dto.vehicleConditionOptionIds !== undefined) {
      await tx.maintenanceCardConditionOption.deleteMany({
        where: { maintenanceCardId: cardId },
      });
      if (dto.vehicleConditionOptionIds.length) {
        await tx.maintenanceCardConditionOption.createMany({
          data: dto.vehicleConditionOptionIds.map((conditionOptionId) => ({
            maintenanceCardId: cardId,
            conditionOptionId,
          })),
        });
      }
    }
    if (dto.vehicleItemOptionIds !== undefined) {
      await tx.maintenanceCardItemOption.deleteMany({ where: { maintenanceCardId: cardId } });
      if (dto.vehicleItemOptionIds.length) {
        await tx.maintenanceCardItemOption.createMany({
          data: dto.vehicleItemOptionIds.map((itemOptionId) => ({
            maintenanceCardId: cardId,
            itemOptionId,
          })),
        });
      }
    }
  }

  private async createSelections(
    tx: Prisma.TransactionClient,
    cardId: number,
    dto: CreateMaintenanceCardDto,
  ): Promise<void> {
    await Promise.all([
      dto.visitReasonIds?.length
        ? tx.maintenanceCardVisitReason.createMany({
            data: dto.visitReasonIds.map((visitReasonId) => ({
              maintenanceCardId: cardId,
              visitReasonId,
            })),
          })
        : Promise.resolve(),
      dto.vehicleConditionOptionIds?.length
        ? tx.maintenanceCardConditionOption.createMany({
            data: dto.vehicleConditionOptionIds.map((conditionOptionId) => ({
              maintenanceCardId: cardId,
              conditionOptionId,
            })),
          })
        : Promise.resolve(),
      dto.vehicleItemOptionIds?.length
        ? tx.maintenanceCardItemOption.createMany({
            data: dto.vehicleItemOptionIds.map((itemOptionId) => ({
              maintenanceCardId: cardId,
              itemOptionId,
            })),
          })
        : Promise.resolve(),
    ]);
  }

  private workData(cardId: number, works: RequiredWorkInputDto[]) {
    return works.map(({ description, displayOrder, isRequired, estimatedCost }) => ({
      maintenanceCardId: cardId,
      description: description.trim(),
      displayOrder,
      isRequired: isRequired ?? true,
      estimatedCost:
        estimatedCost == null ? estimatedCost : new Prisma.Decimal(estimatedCost),
    }));
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

  private async nextCardNumber(tx: Prisma.TransactionClient): Promise<string> {    const [row] = await tx.$queryRaw<Array<{ sequenceValue: bigint }>>`
      SELECT nextval('maintenance_card_number_seq') AS "sequenceValue"
    `;
    return `RP-${new Date().getUTCFullYear()}-${row.sequenceValue.toString().padStart(6, '0')}`;
  }

  private optionalText(value?: string): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private isUniqueError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
