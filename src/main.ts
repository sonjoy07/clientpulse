import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { SecurityHeadersMiddleware } from './common/middleware/security.middleware.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable Graceful Shutdown Hooks
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 4000;

  // Global API Prefix (exclude root URL for welcome/status check)
  app.setGlobalPrefix('api/v1', {
    exclude: ['/'],
  });

  // Trust Proxy behind Nginx / cloud load balancers
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security Headers & Request ID Middleware
  const securityMiddleware = new SecurityHeadersMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) =>
    securityMiddleware.use(req, res, next),
  );

  // Production CORS Configuration
  const nodeEnv =
    configService.get<string>('environment') ||
    process.env.NODE_ENV ||
    'development';
  const frontendUrl = process.env.FRONTEND_URL;
  const allowedOrigins =
    nodeEnv === 'production' && frontendUrl
      ? frontendUrl.split(',').map((u) => u.trim())
      : true;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port, '0.0.0.0');
  logger.log(`ClientPulse API is running on: http://0.0.0.0:${port}/api/v1`);
  logger.log(`Health check available at: http://0.0.0.0:${port}/api/v1/health`);
}

void bootstrap();
