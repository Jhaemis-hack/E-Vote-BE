import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/helpers/global.filter';
import { initializeDataSource } from './migrations/migration.config';
import { HttpExceptionFilter } from './shared/helpers/http-exception-filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  try {
    await initializeDataSource();
    logger.log('Data Source has been initialized!');
  } catch (err) {
    logger.error('Error during Data Source initialization', err);
    process.exit(1);
  }

  logger.log('Database migrations were applied automatically on startup');

  app.enableCors();
  app.setGlobalPrefix('api/v1');
  // app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  // app.useGlobalFilters(new GlobalExceptionFilter(), new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Resolve API')
    .setDescription(
      'Welcome to the Resolve API. This API provides a comprehensive set of endpoints that enable secure, transparent, and efficient online voting.\
       It supports the complete election lifecycle—from user registration and authentication to election setup, candidate management, voting link generation, and vote casting.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port: number = parseInt(configService.get<string>('PORT') || '3000', 10);
  await app.listen(port);

  logger.log({
    message: '🚀 Application startup in progress...',
    status: 'Running',
    port,
    url: `http://localhost:${port}/api/v1`,
    timestamp: new Date().toISOString(),
  });
}

bootstrap().catch(err => {
  console.error('Error during bootstrap', err);
  process.exit(1);
});
