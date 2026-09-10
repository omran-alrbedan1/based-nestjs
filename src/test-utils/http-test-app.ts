import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import {
  AcceptLanguageResolver,
  I18nJsonLoader,
  I18nModule,
  I18nService,
  I18nValidationPipe,
} from 'nestjs-i18n';
import * as path from 'path';
import { ApiExceptionFilter } from 'src/common/filters/api-exception.filter';
import { TransformInterceptor } from 'src/utils/transform.interceptor';

export const httpTestI18nImports = [
  I18nModule.forRoot({
    fallbackLanguage: 'en',
    loader: I18nJsonLoader,
    loaderOptions: {
      path: path.join(process.cwd(), 'src/i18n'),
      watch: false,
    },
    resolvers: [AcceptLanguageResolver],
  }),
];

export async function configureHttpTestApp(app: INestApplication): Promise<INestApplication> {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector), app.get(I18nService)));
  app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost), app.get(I18nService)));
  await app.init();

  return app;
}
