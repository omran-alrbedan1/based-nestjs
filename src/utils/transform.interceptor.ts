import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Observable, map } from 'rxjs';

export const RESPONSE_MESSAGE_KEY = 'response_message';
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message);

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly i18n: I18nService,
  ) {}

  private resolveMessage(raw: string, lang: string): string {
    const translated = this.i18n.translate(raw, {
      lang,
      defaultValue: raw,
    });

    if (typeof translated === 'string' && translated !== raw) {
      return translated;
    }

    return this.humanizeMessageKey(raw);
  }

  private humanizeMessageKey(key: string): string {
    const segment = key.split('.').pop() ?? key;
    const normalized = segment.replace(/_/g, ' ').trim();

    if (!normalized) {
      return 'Success.';
    }

    const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);

    return capitalized.endsWith('.') ? capitalized : `${capitalized}.`;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const statusCode = context.switchToHttp().getResponse<Response>().statusCode;

    const raw =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'common.responses.success';

    const lang = I18nContext.current(context)?.lang ?? I18nContext.current()?.lang ?? 'en';
    const message = this.resolveMessage(raw, lang);

    return next.handle().pipe(
      map((data) => ({
        statusCode,
        message,
        data,
      })),
    );
  }
}
