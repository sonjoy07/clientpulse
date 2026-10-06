import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  logger.log('Initializing ClientPulse BullMQ Background Worker context...');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Enable NestJS lifecycle shutdown hooks
  app.enableShutdownHooks();

  let isShuttingDown = false;

  const handleShutdown = async (signal: string) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    logger.log(
      `Received ${signal}. Shutting down worker application context gracefully...`,
    );

    try {
      await app.close();
      logger.log(
        'Worker application context closed successfully. Exiting process.',
      );
      process.exit(0);
    } catch (error) {
      logger.error('Error during worker graceful shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void handleShutdown('SIGTERM'));
  process.on('SIGINT', () => void handleShutdown('SIGINT'));

  logger.log('ClientPulse BullMQ Worker is active and processing jobs.');
}

void bootstrap();
