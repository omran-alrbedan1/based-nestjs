import { ReadStream } from 'node:fs';

export type MaintenanceMediaKind = 'photos' | 'signatures';

export interface StoredFile {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

export interface QuarantinedFile {
  originalStorageKey: string;
  quarantineStorageKey: string;
}

export interface ReadableStoredFile {
  stream: ReadStream;
  mimeType: string;
  sizeBytes: number;
}
