import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeDataSource } from './migrations/migration.config';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { HttpExceptionFilter } from './shared/helpers/http-exception-filter';

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
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

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
