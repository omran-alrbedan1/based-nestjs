import { Injectable } from '@nestjs/common';
import {
  MaintenanceCardStatus,
  MaintenanceWorkEventType,
  MaintenanceWorkStatus,
  Prisma,
} from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { createPaginatedResponse, normalizeListQuery } from 'src/common/utils/pagination.util';
import { hasPrismaErrorCode } from 'src/common/utils/prisma-error.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMaintenanceCardDto, UpdateMaintenanceCardDto } from './dto/maintenance-card.dto';
import { MaintenanceCardListQueryDto } from './dto/maintenance-card-list-query.dto';
import { localizeEmbeddedOptions } from './maintenance-card.mapper';
import { maintenanceCardDetailInclude } from './maintenance-card.selects';
import { MaintenanceCardValidator } from './maintenance-card.validator';
import { buildMaintenanceCardWhere } from './maintenance-cards.query-builder';
import { buildWorkRow } from './maintenance-card-work.service';

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
        return localizeEmbeddedOptions(created);
      });
    } catch (error) {
      if (hasPrismaErrorCode(error, 'P2002')) {
        throw new AppException(409, 'maintenanceCards.errors.duplicate_number');
      }
      throw error;
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
    return localizeEmbeddedOptions(card);
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
      return localizeEmbeddedOptions(card);
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
      this.createWorkRows(tx, cardId, dto, userId),
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

  private async createWorkRows(
    tx: Prisma.TransactionClient,
    cardId: number,
    dto: CreateMaintenanceCardDto,
    userId: number,
  ): Promise<void> {
    if (!dto.requiredWorks?.length) return;
    await tx.maintenanceCardRequiredWork.createMany({
      data: dto.requiredWorks.map((w) => buildWorkRow(cardId, w)),
    });
    const created = await tx.maintenanceCardRequiredWork.findMany({
      where: { maintenanceCardId: cardId },
      select: { id: true, description: true },
    });
    if (created.length) {
      await tx.maintenanceWorkEvent.createMany({
        data: created.map((work) => ({
          maintenanceCardId: cardId,
          requiredWorkId: work.id,
          eventType: MaintenanceWorkEventType.CREATED,
          fromStatus: null,
          toStatus: MaintenanceWorkStatus.PENDING,
          workDescriptionSnapshot: work.description,
          changedByUserId: userId,
        })),
      });
    }
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

  private async nextCardNumber(tx: Prisma.TransactionClient): Promise<string> {
    const [row] = await tx.$queryRaw<Array<{ sequenceValue: bigint }>>`
      SELECT nextval('maintenance_card_number_seq') AS "sequenceValue"
    `;
    return `RP-${new Date().getUTCFullYear()}-${row.sequenceValue.toString().padStart(6, '0')}`;
  }

  private optionalText(value?: string): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
