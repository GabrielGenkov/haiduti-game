import 'reflect-metadata';
import { config } from 'dotenv';
config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  app.useWebSocketAdapter(new WsAdapter(app));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Haiduti backend running on port ${port}`);
}

bootstrap();
