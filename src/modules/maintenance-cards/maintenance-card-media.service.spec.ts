import { MaintenanceCardStatus } from 'generated/prisma/client';
import { AppException } from 'src/common/exceptions/app.exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { LocalFileStorageService } from 'src/storage/local-file-storage.service';
import { MaintenanceCardMediaService } from './maintenance-card-media.service';

describe('MaintenanceCardMediaService', () => {
  const prisma = {
    maintenanceCard: { findUnique: jest.fn(), update: jest.fn() },
    maintenanceCardPhoto: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const storage = {
    save: jest.fn(),
    remove: jest.fn(),
    quarantine: jest.fn(),
    restore: jest.fn(),
    open: jest.fn(),
  };
  let service: MaintenanceCardMediaService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.maintenanceCard.findUnique.mockResolvedValue({
      id: 'card-1',
      status: MaintenanceCardStatus.OPEN,
      signatureStorageKey: null,
    });
    prisma.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
    service = new MaintenanceCardMediaService(
      prisma as unknown as PrismaService,
      storage as unknown as LocalFileStorageService,
    );
  });

  it('deletes a photo using quarantine before database deletion', async () => {
    prisma.maintenanceCardPhoto.findUnique.mockResolvedValue({
      id: 'photo-1',
      maintenanceCardId: 'card-1',
      storageKey: 'maintenance-cards/photos/photo.jpg',
    });
    storage.quarantine.mockResolvedValue({
      originalStorageKey: 'maintenance-cards/photos/photo.jpg',
      quarantineStorageKey: 'maintenance-cards/.quarantine/photo.jpg',
    });

    await service.deletePhoto('card-1', 'photo-1');

    expect(storage.quarantine.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.maintenanceCardPhoto.delete.mock.invocationCallOrder[0],
    );
    expect(storage.remove).toHaveBeenCalledWith('maintenance-cards/.quarantine/photo.jpg');
  });

  it('restores a quarantined photo when database deletion fails', async () => {
    const quarantined = {
      originalStorageKey: 'maintenance-cards/photos/photo.jpg',
      quarantineStorageKey: 'maintenance-cards/.quarantine/photo.jpg',
    };
    prisma.maintenanceCardPhoto.findUnique.mockResolvedValue({
      id: 'photo-1',
      maintenanceCardId: 'card-1',
      storageKey: quarantined.originalStorageKey,
    });
    storage.quarantine.mockResolvedValue(quarantined);
    prisma.maintenanceCardPhoto.delete.mockRejectedValue(new Error('database unavailable'));

    await expect(service.deletePhoto('card-1', 'photo-1')).rejects.toThrow('database unavailable');
    expect(storage.restore).toHaveBeenCalledWith(quarantined);
  });

  it('removes a new signature if its database update fails', async () => {
    storage.save.mockResolvedValue({
      storageKey: 'maintenance-cards/signatures/new.png',
      mimeType: 'image/png',
      sizeBytes: 100,
    });
    prisma.maintenanceCard.update.mockRejectedValue(new Error('database unavailable'));

    await expect(service.uploadSignature('card-1', {} as Express.Multer.File)).rejects.toThrow(
      'database unavailable',
    );
    expect(storage.remove).toHaveBeenCalledWith('maintenance-cards/signatures/new.png');
  });

  it('does not allow mutation of a closed card', async () => {
    prisma.maintenanceCard.findUnique.mockResolvedValue({
      id: 'card-1',
      status: MaintenanceCardStatus.CLOSED,
      signatureStorageKey: null,
    });
    await expect(
      service.uploadSignature('card-1', {} as Express.Multer.File),
    ).rejects.toBeInstanceOf(AppException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('never returns storage keys in photo metadata', async () => {
    prisma.maintenanceCardPhoto.findMany.mockResolvedValue([
      {
        id: 'photo-1',
        maintenanceCardId: 'card-1',
        storageKey: 'maintenance-cards/photos/private.jpg',
        originalFileName: 'car.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: BigInt(100),
        displayOrder: 0,
        createdAt: new Date('2026-09-04T00:00:00Z'),
      },
    ]);

    const [photo] = await service.listPhotos('card-1');
    expect(photo).not.toHaveProperty('storageKey');
    expect(photo.contentUrl).toBe('/api/v1/maintenance-cards/card-1/photos/photo-1/content');
  });
});
