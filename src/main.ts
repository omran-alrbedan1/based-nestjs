import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';
import { I18nValidationPipe } from 'nestjs-i18n';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  // sett global validation :
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

  // enable cors :
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? 'http://localhost:3000',
    creddentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    maxAge: 86400,
    allowedHeaders: ['Content-type', 'Authorization', 'Accept', 'Accept-Language'],
    exposedHeaders: ['X-Total-Count', 'X-Pagination'],
  });

  const port = process.env.PORT ?? 3000;
  try {
    await app.listen(port);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}
bootstrap();
