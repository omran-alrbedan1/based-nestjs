import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';

export interface JwtConfiguration {
  accessSecret: string;
  accessExpiresIn: SignOptions['expiresIn'];
  refreshSecret: string;
  refreshExpiresIn: SignOptions['expiresIn'];
}

export function getJwtConfiguration(configService: ConfigService): JwtConfiguration {
  return {
    accessSecret: configService.getOrThrow<string>('JWT_SECRET'),
    accessExpiresIn: configService.getOrThrow<SignOptions['expiresIn']>('JWT_EXPIRES_IN'),
    refreshSecret: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    refreshExpiresIn: configService.getOrThrow<SignOptions['expiresIn']>('JWT_REFRESH_EXPIRES_IN'),
  };
}
