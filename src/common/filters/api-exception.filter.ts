import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';
import {
  I18nContext,
  I18nService,
  I18nValidationError,
  I18nValidationException,
} from 'nestjs-i18n';
import { AppException } from '../exceptions/app.exception';

interface ErrorEnvelope {
  statusCode: number;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
  timestamp: string;
  path: string;
}

@Injectable()
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly i18n: I18nService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response: unknown = ctx.getResponse<unknown>();
    const request = ctx.getRequest<Request>();
    const i18nContext = I18nContext.current(host) ?? I18nContext.current();
    const lang = i18nContext?.lang ?? 'en';

    const normalized = this.normalizeException(exception, lang);

    if (normalized.statusCode >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        `Unhandled exception for ${request?.method ?? 'UNKNOWN'} ${request?.url ?? ''}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorEnvelope = {
      statusCode: normalized.statusCode,
      message: this.translate(normalized.code, lang, normalized.args),
      error: {
        code: normalized.code,
        ...(normalized.details !== undefined ? { details: normalized.details } : {}),
      },
      timestamp: new Date().toISOString(),
      path: request?.url ?? '',
    };

    httpAdapter.reply(response, body, normalized.statusCode);
  }

  private normalizeException(
    exception: unknown,
    lang: string,
  ): {
    statusCode: number;
    code: string;
    args?: Record<string, unknown>;
    details?: unknown;
  } {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatusCode(),
        code: exception.getTranslationKey(),
        args: exception.getTranslationArgs(),
        details: exception.getErrorDetails(),
      };
    }

    if (exception instanceof I18nValidationException) {
      return {
        statusCode: exception.getStatus(),
        code: 'validation.invalid_input',
        details: this.formatValidationErrors(exception.errors ?? [], lang),
      };
    }

    if (this.isPrismaKnownRequestError(exception)) {
      return this.mapPrismaException(exception);
    }

    if (exception instanceof HttpException) {
      return this.mapHttpException(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'system.errors.internal_server_error',
    };
  }

  private mapPrismaException(exception: { code: string }): {
    statusCode: number;
    code: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'database.errors.unique_constraint',
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'database.errors.record_not_found',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'database.errors.operation_failed',
        };
    }
  }

  private isPrismaKnownRequestError(exception: unknown): exception is { code: string } {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof exception.code === 'string'
    );
  }

  private mapHttpException(exception: HttpException): {
    statusCode: number;
    code: string;
    args?: Record<string, unknown>;
    details?: unknown;
  } {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (
      typeof response === 'object' &&
      response !== null &&
      'key' in response &&
      typeof response.key === 'string'
    ) {
      return {
        statusCode,
        code: response.key,
        details:
          'details' in response && response.details !== undefined ? response.details : undefined,
      };
    }

    const fallbackByStatus: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'common.errors.bad_request',
      [HttpStatus.UNAUTHORIZED]: 'auth.errors.unauthorized',
      [HttpStatus.FORBIDDEN]: 'common.errors.forbidden',
      [HttpStatus.NOT_FOUND]: 'common.errors.not_found',
      [HttpStatus.CONFLICT]: 'common.errors.conflict',
      [HttpStatus.TOO_MANY_REQUESTS]: 'common.errors.too_many_requests',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'system.errors.internal_server_error',
    };

    return {
      statusCode,
      code: fallbackByStatus[statusCode] ?? 'system.errors.internal_server_error',
    };
  }

  private formatValidationErrors(
    errors: I18nValidationError[],
    lang: string,
  ): Array<{ field: string; messages: string[] }> {
    const flattened: Array<{ field: string; messages: string[] }> = [];

    const walk = (entries: I18nValidationError[], parentPath?: string) => {
      for (const entry of entries) {
        const field = parentPath ? `${parentPath}.${entry.property}` : entry.property;

        const messages = Object.entries(entry.constraints ?? {}).map(
          ([constraintKey, constraintValue]) => {
            if (constraintKey === 'whitelistValidation') {
              return this.translate('validation.whitelist', lang, {
                property: field,
              });
            }

            return this.translateValidationConstraint(field, constraintValue, lang, entry);
          },
        );

        if (messages.length > 0) {
          flattened.push({ field, messages });
        }

        if (entry.children?.length) {
          walk(entry.children, field);
        }
      }
    };

    walk(errors);

    return flattened;
  }

  private translateValidationConstraint(
    field: string,
    rawConstraint: string,
    lang: string,
    entry: I18nValidationError,
  ): string {
    const separatorIndex = rawConstraint.indexOf('|');
    const translationKey =
      separatorIndex === -1 ? rawConstraint : rawConstraint.slice(0, separatorIndex);
    const argsString = separatorIndex === -1 ? '' : rawConstraint.slice(separatorIndex + 1);

    let args: Record<string, unknown> = {};

    if (argsString) {
      try {
        args = JSON.parse(argsString) as Record<string, unknown>;
      } catch {
        args = {};
      }
    }

    const constraintsSource = Array.isArray(args.constraints)
      ? args.constraints.reduce<Record<string, unknown>>((acc, value, index) => {
          acc[index.toString()] = value;
          return acc;
        }, {})
      : (entry.constraints ?? {});

    return this.translate(translationKey, lang, {
      property: field,
      value: entry.value,
      target: entry.target,
      contexts: entry.contexts,
      ...args,
      constraints: constraintsSource,
    });
  }

  private translate(key: string, lang: string, args?: Record<string, unknown>): string {
    return this.i18n.translate(key, {
      lang,
      args,
      defaultValue: key,
    });
  }
}
