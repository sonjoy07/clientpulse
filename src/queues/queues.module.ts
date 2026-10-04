import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from './queues.constants.js';
import { getRedisConfig } from './redis.config.js';
import { QueueMonitorService } from './queue-monitor.service.js';
import { QueuesController } from './queues.controller.js';
import { RedisService } from './redis.service.js';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: getRedisConfig(configService),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: QUEUES.AI_REPORT,
    }),
  ],
  controllers: [QueuesController],
  providers: [QueueMonitorService, RedisService],
  exports: [BullModule, QueueMonitorService, RedisService],
})
export class QueuesModule {}
