import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const config = new DocumentBuilder()
    .setTitle('E-Vote API')
    .setDescription('The E-Vote API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  app.enableCors();
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log({
    message: "🚀 Application startup in progress...",
    status: "Running",
    port,
    url: `http://localhost:${port}/api/v1`,
    timestamp: new Date().toISOString(),
  });
}

bootstrap().catch((err) => {
  console.error("Error during bootstrap", err);
  process.exit(1);
});
