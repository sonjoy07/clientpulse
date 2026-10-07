import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { SecurityHeadersMiddleware } from '../src/common/middleware/security.middleware.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedHandler: any = null;

async function createServer() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api/v1');
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  const securityMiddleware = new SecurityHeadersMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) =>
    securityMiddleware.use(req, res, next),
  );

  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async function handler(req: Request, res: Response) {
  if (!cachedHandler) {
    cachedHandler = await createServer();
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return cachedHandler(req, res);
}
