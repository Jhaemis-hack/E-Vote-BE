import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const config = new DocumentBuilder()
    .setTitle('E-Vote API')
    .setDescription(
      'Welcome to the E-Vote API. This API provides a comprehensive set of endpoints that enable secure, transparent, and efficient online voting. It supports the complete election lifecycle—from user registration and authentication to election setup, candidate management, voting link generation, and vote casting.',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  app.enableCors();
  app.setGlobalPrefix('api/v1');

  const configService = app.get(ConfigService);
  const port: number = parseInt(
    configService.get<string>('PORT') || '3000',
    10,
  );
  await app.listen(port);

  logger.log({
    message: '🚀 Application startup in progress...',
    status: 'Running',
    port,
    url: `http://localhost:${port}/api/v1`,
    timestamp: new Date().toISOString(),
  });
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap', err);
  process.exit(1);
});
