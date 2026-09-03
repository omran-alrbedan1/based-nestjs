import { HttpException, HttpStatus } from '@nestjs/common';

export interface AppExceptionDetails {
  [key: string]: unknown;
}

interface AppExceptionResponse {
  key: string;
  args?: Record<string, unknown>;
  details?: AppExceptionDetails;
}

export class AppException extends HttpException {
  constructor(
    private readonly statusCode: HttpStatus,
    private readonly key: string,
    private readonly args?: Record<string, unknown>,
    private readonly details?: AppExceptionDetails,
  ) {
    super({ key, args, details } satisfies AppExceptionResponse, statusCode);
  }

  getStatusCode(): number {
    return this.statusCode;
  }

  getTranslationKey(): string {
    return this.key;
  }

  getTranslationArgs(): Record<string, unknown> | undefined {
    return this.args;
  }

  getErrorDetails(): AppExceptionDetails | undefined {
    return this.details;
  }
}
