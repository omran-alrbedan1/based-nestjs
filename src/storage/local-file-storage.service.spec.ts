import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { AppException } from 'src/common/exceptions/app.exception';
import { LocalFileStorageService } from './local-file-storage.service';

describe('LocalFileStorageService', () => {
  let directory: string;
  let service: LocalFileStorageService;
  let cwdSpy: jest.SpyInstance;

  beforeEach(async () => {
    directory = join(tmpdir(), `rpg-storage-${randomUUID()}`);
    await mkdir(directory, { recursive: true });
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(directory);
    service = new LocalFileStorageService();
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await rm(directory, { recursive: true, force: true });
  });

  it('stores a valid image using a generated private key', async () => {
    const stored = await service.save(
      {
        originalname: 'vehicle.JPG',
        mimetype: 'image/jpeg',
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
        size: 4,
      } as Express.Multer.File,
      'photos',
    );
    expect(stored.storageKey).toMatch(/^maintenance-cards\/photos\/[\w-]+\.jpg$/);
    expect(stored.storageKey).not.toContain('vehicle');
  });

  it('rejects spoofed image content even with an allowed MIME and extension', async () => {
    await expect(
      service.save(
        {
          originalname: 'fake.png',
          mimetype: 'image/png',
          buffer: Buffer.from('not an image'),
          size: 12,
        } as Express.Multer.File,
        'photos',
      ),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('rejects path traversal storage keys', async () => {
    await expect(service.open('../secret.jpg')).rejects.toBeInstanceOf(AppException);
  });
});
