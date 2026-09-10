import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  MaintenanceMediaKind,
  QuarantinedFile,
  ReadableStoredFile,
  StoredFile,
} from './file-storage.types';

const MEDIA_ROOT_SEGMENT = 'maintenance-cards';
const MIME_EXTENSIONS: Record<string, readonly string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};
const CANONICAL_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class LocalFileStorageService {
  private readonly root = resolve(process.cwd(), 'uploads');

  async save(file: Express.Multer.File, kind: MaintenanceMediaKind): Promise<StoredFile> {
    this.validateImage(file);
    const storageKey = `${MEDIA_ROOT_SEGMENT}/${kind}/${randomUUID()}${CANONICAL_EXTENSION[file.mimetype]}`;
    const target = this.resolveStorageKey(storageKey);
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, file.buffer, { flag: 'wx' });
    return { storageKey, mimeType: file.mimetype, sizeBytes: file.size };
  }

  async quarantine(storageKey: string): Promise<QuarantinedFile> {
    const source = this.resolveStorageKey(storageKey);
    const quarantineStorageKey = `${MEDIA_ROOT_SEGMENT}/.quarantine/${randomUUID()}${extname(storageKey)}`;
    const target = this.resolveStorageKey(quarantineStorageKey);
    await mkdir(resolve(target, '..'), { recursive: true });
    await rename(source, target);
    return { originalStorageKey: storageKey, quarantineStorageKey };
  }

  async restore(file: QuarantinedFile): Promise<void> {
    const source = this.resolveStorageKey(file.quarantineStorageKey);
    const target = this.resolveStorageKey(file.originalStorageKey);
    await mkdir(resolve(target, '..'), { recursive: true });
    await rename(source, target);
  }

  async remove(storageKey: string): Promise<void> {
    await rm(this.resolveStorageKey(storageKey), { force: true });
  }

  async open(storageKey: string, storedMimeType?: string | null): Promise<ReadableStoredFile> {
    const path = this.resolveStorageKey(storageKey);
    try {
      const details = await stat(path);
      return {
        stream: createReadStream(path),
        mimeType: storedMimeType ?? this.mimeTypeFromExtension(storageKey),
        sizeBytes: details.size,
      };
    } catch {
      throw new AppException(404, 'maintenanceMedia.errors.file_missing');
    }
  }

  private validateImage(file: Express.Multer.File): void {
    const allowedExtensions = MIME_EXTENSIONS[file.mimetype];
    const extension = extname(file.originalname).toLowerCase();
    if (
      !allowedExtensions?.includes(extension) ||
      !this.hasValidSignature(file.buffer, file.mimetype)
    ) {
      throw new AppException(400, 'maintenanceMedia.errors.invalid_file_type');
    }
  }

  private hasValidSignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === 'image/jpeg') {
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimeType === 'image/png') {
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimeType === 'image/webp') {
      return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    }
    return false;
  }

  private resolveStorageKey(storageKey: string): string {
    if (isAbsolute(storageKey))
      throw new AppException(400, 'maintenanceMedia.errors.invalid_storage_key');
    const target = resolve(this.root, storageKey);
    const child = relative(this.root, target);
    if (!child || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) {
      throw new AppException(400, 'maintenanceMedia.errors.invalid_storage_key');
    }
    return target;
  }

  private mimeTypeFromExtension(storageKey: string): string {
    const extension = extname(storageKey).toLowerCase();
    if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
    if (extension === '.png') return 'image/png';
    if (extension === '.webp') return 'image/webp';
    return 'application/octet-stream';
  }
}
