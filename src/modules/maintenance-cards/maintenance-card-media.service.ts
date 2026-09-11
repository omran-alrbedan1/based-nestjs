import { Injectable, Logger } from '@nestjs/common';
import { MaintenanceCardStatus } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { StoredFile } from 'src/storage/file-storage.types';
import { LocalFileStorageService } from 'src/storage/local-file-storage.service';

@Injectable()
export class MaintenanceCardMediaService {
  private readonly logger = new Logger(MaintenanceCardMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalFileStorageService,
  ) {}

  async uploadPhotos(
    cardId: number,
    files: Express.Multer.File[],
    displayOrder: number | undefined,
    userId: number,
  ) {
    if (!files.length) throw new AppException(400, 'maintenanceMedia.errors.photo_required');
    await this.assertOpenCard(cardId);
    const baseOrder = displayOrder ?? (await this.nextPhotoOrder(cardId));
    const saved: StoredFile[] = [];
    try {
      for (const file of files) saved.push(await this.storage.save(file, 'photos'));
      const photos = await this.prisma.$transaction(
        saved.map((file, index) =>
          this.prisma.maintenanceCardPhoto.create({
            data: {
              maintenanceCardId: cardId,
              storageKey: file.storageKey,
              originalFileName: files[index].originalname,
              mimeType: file.mimeType,
              sizeBytes: BigInt(file.sizeBytes),
              displayOrder: baseOrder + index,
              uploadedByUserId: userId,
            },
          }),
        ),
      );
      return photos.map((photo) => this.photoResponse(photo));
    } catch (error) {
      await Promise.allSettled(saved.map(({ storageKey }) => this.storage.remove(storageKey)));
      throw error;
    }
  }

  async listPhotos(cardId: number) {
    await this.assertCardExists(cardId);
    const photos = await this.prisma.maintenanceCardPhoto.findMany({
      where: { maintenanceCardId: cardId },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return photos.map((photo) => this.photoResponse(photo));
  }

  async photoContent(cardId: number, photoId: number) {
    await this.assertCardExists(cardId);
    const photo = await this.prisma.maintenanceCardPhoto.findUnique({
      where: { id: photoId },
    });
    if (!photo) throw new AppException(404, 'maintenanceMedia.errors.photo_not_found');
    if (photo.maintenanceCardId !== cardId) {
      throw new AppException(404, 'maintenanceMedia.errors.photo_not_found');
    }
    return this.storage.open(photo.storageKey, photo.mimeType);
  }

  async deletePhoto(cardId: number, photoId: number): Promise<void> {
    await this.assertOpenCard(cardId);
    const photo = await this.prisma.maintenanceCardPhoto.findUnique({
      where: { id: photoId },
    });
    if (!photo || photo.maintenanceCardId !== cardId) {
      throw new AppException(404, 'maintenanceMedia.errors.photo_not_found');
    }
    const quarantined = await this.quarantineOrThrow(photo.storageKey);
    try {
      await this.prisma.maintenanceCardPhoto.delete({
        where: { id: photo.id },
      });
    } catch (error) {
      await this.storage.restore(quarantined);
      throw error;
    }
    await this.purgeQuarantine(quarantined.quarantineStorageKey);
  }

  async uploadSignature(cardId: number, file: Express.Multer.File) {
    if (!file) throw new AppException(400, 'maintenanceMedia.errors.signature_required');
    const card = await this.assertOpenCard(cardId);
    const saved = await this.storage.save(file, 'signatures');
    try {
      await this.prisma.maintenanceCard.update({
        where: { id: cardId },
        data: { signatureStorageKey: saved.storageKey },
      });
    } catch (error) {
      await this.storage.remove(saved.storageKey);
      throw error;
    }
    if (card.signatureStorageKey) {
      try {
        await this.storage.remove(card.signatureStorageKey);
      } catch {
        this.logger.error(`Unable to remove a replaced signature for maintenance card ${cardId}`);
      }
    }
    return this.signatureResponse(cardId, saved.mimeType, saved.sizeBytes);
  }

  async getSignature(cardId: number) {
    const card = await this.assertCardExists(cardId);
    if (!card.signatureStorageKey)
      throw new AppException(404, 'maintenanceMedia.errors.signature_not_found');
    const file = await this.storage.open(card.signatureStorageKey);
    file.stream.destroy();
    return this.signatureResponse(cardId, file.mimeType, file.sizeBytes);
  }

  async signatureContent(cardId: number) {
    const card = await this.assertCardExists(cardId);
    if (!card.signatureStorageKey)
      throw new AppException(404, 'maintenanceMedia.errors.signature_not_found');
    return this.storage.open(card.signatureStorageKey);
  }

  async deleteSignature(cardId: number): Promise<void> {
    const card = await this.assertOpenCard(cardId);
    if (!card.signatureStorageKey)
      throw new AppException(404, 'maintenanceMedia.errors.signature_not_found');
    const quarantined = await this.quarantineOrThrow(card.signatureStorageKey);
    try {
      await this.prisma.maintenanceCard.update({
        where: { id: cardId },
        data: { signatureStorageKey: null },
      });
    } catch (error) {
      await this.storage.restore(quarantined);
      throw error;
    }
    await this.purgeQuarantine(quarantined.quarantineStorageKey);
  }

  private async assertCardExists(cardId: number) {
    const card = await this.prisma.maintenanceCard.findUnique({
      where: { id: cardId },
      select: { id: true, status: true, signatureStorageKey: true },
    });
    if (!card) throw new AppException(404, 'maintenanceCards.errors.not_found');
    return card;
  }

  private async assertOpenCard(cardId: number) {
    const card = await this.assertCardExists(cardId);
    if (card.status !== MaintenanceCardStatus.OPEN) {
      throw new AppException(409, 'maintenanceCards.errors.closed_read_only');
    }
    return card;
  }

  private async nextPhotoOrder(cardId: number): Promise<number> {
    const aggregate = await this.prisma.maintenanceCardPhoto.aggregate({
      where: { maintenanceCardId: cardId },
      _max: { displayOrder: true },
    });
    return (aggregate._max.displayOrder ?? -1) + 1;
  }

  private photoResponse(photo: {
    id: number;
    originalFileName: string | null;
    mimeType: string | null;
    sizeBytes: bigint | null;
    displayOrder: number;
    createdAt: Date;
    maintenanceCardId: number;
  }) {
    return {
      id: photo.id,
      originalFileName: photo.originalFileName,
      mimeType: photo.mimeType,
      sizeBytes: photo.sizeBytes?.toString() ?? null,
      displayOrder: photo.displayOrder,
      createdAt: photo.createdAt,
      contentUrl: `/api/v1/maintenance-cards/${photo.maintenanceCardId}/photos/${photo.id}/content`,
    };
  }

  private signatureResponse(cardId: number, mimeType: string, sizeBytes: number) {
    return {
      mimeType,
      sizeBytes: String(sizeBytes),
      contentUrl: `/api/v1/maintenance-cards/${cardId}/signature/content`,
    };
  }

  private async quarantineOrThrow(storageKey: string) {
    try {
      return await this.storage.quarantine(storageKey);
    } catch {
      throw new AppException(404, 'maintenanceMedia.errors.file_missing');
    }
  }

  private async purgeQuarantine(storageKey: string): Promise<void> {
    try {
      await this.storage.remove(storageKey);
    } catch {
      this.logger.error('Unable to purge a quarantined maintenance-card file');
    }
  }
}
