import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';
import { I18nValidationPipe } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(
    helmet({
      // Swagger UI requires inline styles/scripts. Other Helmet API defaults remain enabled.
      contentSecurityPolicy: false,
    }),
  );

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
    origin: configService
      .getOrThrow<string>('ALLOWED_ORIGINS')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    maxAge: 86400,
    allowedHeaders: ['Content-type', 'Authorization', 'Accept', 'Accept-Language'],
    exposedHeaders: ['X-Total-Count', 'X-Pagination'],
  });

  if (configService.get<boolean>('SWAGGER_ENABLED')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Red Power Garage API')
      .setDescription('Backend API for Red Power Garage.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.getOrThrow<number>('PORT');
  try {
    await app.listen(port);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}
void bootstrap();
